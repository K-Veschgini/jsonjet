import { Stream } from './stream.js';
import { Logger } from './logger.js';
import { JSDBError, ErrorCodes } from './jsdb-error.js';
import { sanitizeForJSON } from '../utils/json-sanitizer.js';

/**
 * StreamManager - Manages named streams as pure data pipes
 * Streams do NOT store data - they only route data to active subscribers
 * This is proper stream processing, not a database
 */
export class StreamManager {
    constructor() {
        this.streams = new Map(); // name -> StreamContainer
        this.nextSubscriptionId = 1;
        this.userSubscriptions = new Map(); // subscriptionId -> { streamName, callback }
        this.globalSubscribers = new Map(); // subscriptionId -> callback - for all-streams subscriptions
        this.logger = null; // Will be initialized lazily
        
        // Event callbacks for stream lifecycle
        this.streamEventCallbacks = new Set(); // callbacks for stream created/deleted
        
        // Create the _log stream at startup
        this.createStreamInternal('_log');
    }

    /**
     * Initialize logger (delayed to avoid circular dependency)
     */
    initializeLogger() {
        if (!this.logger) {
            this.logger = new Logger(this);
        }
    }

    /**
     * Create a new named stream (just a pipe, no storage)
     */
    createStream(name) {
        if (this.streams.has(name)) {
            this.initializeLogger();
            this.logger.error(ErrorCodes.STREAM_ALREADY_EXISTS, `Stream '${name}' already exists`);
            throw new JSDBError(ErrorCodes.STREAM_ALREADY_EXISTS, `Stream '${name}' already exists`);
        }

        return this.createStreamInternal(name);
    }

    /**
     * Internal method to create stream without validation (for system streams like _log)
     */
    createStreamInternal(name) {
        const streamContainer = {
            name,
            stream: new Stream(),
            flowSubscribers: new Map(), // queryId -> { pipeline, callback } - for flows
            userSubscribers: new Map()  // subscriptionId -> callback - for direct user subscriptions
            // NO DATA STORAGE - streams are just pipes!
        };

        this.streams.set(name, streamContainer);
        
        // Emit stream created event (skip for system streams starting with _ to avoid noise)
        if (!name.startsWith('_')) {
            this._emitStreamEvent('created', { streamName: name, streamContainer });
        }
        
        return streamContainer;
    }

    /**
     * Delete a stream and clean up all subscribers
     */
    deleteStream(name) {
        const container = this.streams.get(name);
        if (!container) {
            this.initializeLogger();
            this.logger.error(ErrorCodes.STREAM_NOT_FOUND, `Stream '${name}' does not exist`);
            throw new JSDBError(ErrorCodes.STREAM_NOT_FOUND, `Stream '${name}' does not exist`);
        }

        // Stop all active flows on this stream
        for (const [queryId, { pipeline }] of container.flowSubscribers) {
            try {
                pipeline.finish(); // Gracefully finish the pipeline
            } catch (error) {
                console.warn(`Error finishing pipeline ${queryId}:`, error);
            }
        }

        // Clear all subscriptions
        container.flowSubscribers.clear();
        container.userSubscribers.clear();
        
        // Remove user subscriptions pointing to this stream
        for (const [subId, sub] of this.userSubscriptions) {
            if (sub.streamName === name) {
                this.userSubscriptions.delete(subId);
            }
        }
        this.streams.delete(name);
        
        // Emit stream deleted event
        this._emitStreamEvent('deleted', { streamName: name });
    }

    /**
     * Get stream container by name
     */
    getStream(name) {
        return this.streams.get(name);
    }

    /**
     * Check if stream exists
     */
    hasStream(name) {
        return this.streams.has(name);
    }

    /**
     * List all stream names
     */
    listStreams() {
        return Array.from(this.streams.keys());
    }

    /**
     * Insert data into a stream
     * Data flows immediately to all active subscribers and then disappears
     * If no subscribers are listening, data is lost (correct streaming behavior)
     */
    async insertIntoStream(name, data) {
        const container = this.streams.get(name);
        if (!container) {
            this.initializeLogger();
            this.logger.error(ErrorCodes.STREAM_NOT_FOUND, `Stream '${name}' does not exist`);
            throw new JSDBError(ErrorCodes.STREAM_NOT_FOUND, `Stream '${name}' does not exist`);
        }

        // Handle bulk insert (array) or single insert
        const items = Array.isArray(data) ? data : [data];
        
        const totalSubscribers = container.flowSubscribers.size + container.userSubscribers.size + this.globalSubscribers.size;
        
        // If no active subscribers, data is lost (proper streaming behavior)
        if (totalSubscribers === 0) {
            console.log(`📤 Data inserted into stream '${name}' but no subscribers listening - data lost`);
            return;
        }

        // Push data to all active subscribers immediately
        for (const item of items) {
            // Sanitize data to remove undefined values before processing
            const sanitizedItem = sanitizeForJSON(item);
            
            // Push to flow subscribers (pipelines)
            for (const [queryId, { pipeline }] of container.flowSubscribers) {
                try {
                    pipeline.push(sanitizedItem);
                } catch (error) {
                    console.error(`Error pushing to flow ${queryId}:`, error);
                    // Remove failed subscriber
                    container.flowSubscribers.delete(queryId);
                }
            }
            
            // Push to user subscribers (direct callbacks)
            for (const [subId, callback] of container.userSubscribers) {
                try {
                    callback({ data: sanitizedItem, streamName: name });
                } catch (error) {
                    console.error(`Error calling user subscription ${subId}:`, error);
                    // Remove failed subscriber
                    container.userSubscribers.delete(subId);
                    this.userSubscriptions.delete(subId);
                }
            }
            
            // Push to global subscribers (all streams)
            for (const [subId, callback] of this.globalSubscribers) {
                try {
                    callback({ data: sanitizedItem, streamName: name });
                } catch (error) {
                    console.error(`Error calling global subscription ${subId}:`, error);
                    // Remove failed subscriber
                    this.globalSubscribers.delete(subId);
                }
            }
        }
    }

    /**
     * Flush all pipelines subscribed to a stream
     * This triggers final processing in operators like summarize without windows
     */
    async flushStream(name) {
        const container = this.streams.get(name);
        if (!container) {
            this.initializeLogger();
            this.logger.error(ErrorCodes.STREAM_NOT_FOUND, `Stream '${name}' does not exist`);
            throw new JSDBError(ErrorCodes.STREAM_NOT_FOUND, `Stream '${name}' does not exist`);
        }

        // Call flushAll on all flow pipelines subscribed to this stream
        const flushPromises = [];
        for (const [queryId, { pipeline }] of container.flowSubscribers) {
            try {
                if (pipeline && typeof pipeline.flushAll === 'function') {
                    flushPromises.push(pipeline.flushAll());
                }
            } catch (error) {
                console.error(`Error flushing pipeline ${queryId}:`, error);
            }
        }

        // Wait for all flushes to complete
        await Promise.all(flushPromises);
    }

    /**
     * Subscribe a flow pipeline to a stream (internal use by query engine)
     * Returns a query ID that can be used to unsubscribe
     */
    subscribeFlowToStream(name, pipeline, callback) {
        const container = this.streams.get(name);
        if (!container) {
            this.initializeLogger();
            this.logger.error(ErrorCodes.STREAM_NOT_FOUND, `Stream '${name}' does not exist`);
            throw new JSDBError(ErrorCodes.STREAM_NOT_FOUND, `Stream '${name}' does not exist`);
        }

        const queryId = this.nextSubscriptionId++;
        
        // Store flow subscriber info
        container.flowSubscribers.set(queryId, { pipeline, callback });

        return queryId;
    }

    /**
     * Subscribe a user callback to a stream (public API)
     * Returns a subscription ID that can be used to unsubscribe
     * NOTE: Subscribers only see NEW data flowing through after subscription
     */
    subscribeToStream(streamName, callback) {
        const container = this.streams.get(streamName);
        if (!container) {
            this.initializeLogger();
            this.logger.error(ErrorCodes.STREAM_NOT_FOUND, `Stream '${streamName}' does not exist`);
            throw new JSDBError(ErrorCodes.STREAM_NOT_FOUND, `Stream '${streamName}' does not exist`);
        }

        const subscriptionId = this.nextSubscriptionId++;
        
        // Store user subscription info
        container.userSubscribers.set(subscriptionId, callback);
        this.userSubscriptions.set(subscriptionId, { streamName, callback });

        return subscriptionId;
    }

    /**
     * Subscribe to all streams (receives data from any stream)
     * Returns a subscription ID that can be used to unsubscribe
     */
    subscribeToAllStreams(callback) {
        const subscriptionId = this.nextSubscriptionId++;
        this.globalSubscribers.set(subscriptionId, callback);
        return subscriptionId;
    }

    /**
     * Unsubscribe a flow from a stream (internal use by query engine)
     */
    unsubscribeFlowFromStream(name, queryId) {
        const container = this.streams.get(name);
        if (!container) {
            return false;
        }

        const subscriber = container.flowSubscribers.get(queryId);
        if (subscriber) {
            try {
                subscriber.pipeline.finish();
            } catch (error) {
                console.warn(`Error finishing pipeline ${queryId}:`, error);
            }
            container.flowSubscribers.delete(queryId);
            return true;
        }

        return false;
    }

    /**
     * Unsubscribe a user from a stream (public API)
     */
    unsubscribeFromStream(subscriptionId) {
        const subscription = this.userSubscriptions.get(subscriptionId);
        if (!subscription) {
            return false;
        }

        const { streamName } = subscription;
        const container = this.streams.get(streamName);
        if (container) {
            container.userSubscribers.delete(subscriptionId);
        }
        
        this.userSubscriptions.delete(subscriptionId);
        return true;
    }

    /**
     * Unsubscribe from all streams (global subscription)
     */
    unsubscribeFromAllStreams(subscriptionId) {
        return this.globalSubscribers.delete(subscriptionId);
    }

    /**
     * Get all subscriptions for a user or stream
     */
    getSubscriptions(streamName = null) {
        if (streamName) {
            // Get subscriptions for a specific stream
            const result = [];
            for (const [subId, sub] of this.userSubscriptions) {
                if (sub.streamName === streamName) {
                    result.push({ subscriptionId: subId, streamName: sub.streamName });
                }
            }
            return result;
        } else {
            // Get all subscriptions
            return Array.from(this.userSubscriptions.entries()).map(([subId, sub]) => ({
                subscriptionId: subId,
                streamName: sub.streamName
            }));
        }
    }

    /**
     * Get info about a stream (for debugging/monitoring)
     */
    getStreamInfo(name) {
        const container = this.streams.get(name);
        if (!container) {
            return null;
        }

        return {
            name: container.name,
            flowSubscriberCount: container.flowSubscribers.size,
            userSubscriberCount: container.userSubscribers.size,
            totalSubscriberCount: container.flowSubscribers.size + container.userSubscribers.size,
            flowSubscribers: Array.from(container.flowSubscribers.keys()),
            userSubscribers: Array.from(container.userSubscribers.keys()),
            type: 'pure-stream' // No data storage
        };
    }

    /**
     * Get info about all streams
     */
    getAllStreamInfo() {
        const info = {};
        for (const [name, container] of this.streams) {
            info[name] = {
                name: container.name,
                flowSubscriberCount: container.flowSubscribers.size,
                userSubscriberCount: container.userSubscribers.size,
                totalSubscriberCount: container.flowSubscribers.size + container.userSubscribers.size,
                flowSubscribers: Array.from(container.flowSubscribers.keys()),
                userSubscribers: Array.from(container.userSubscribers.keys()),
                type: 'pure-stream'
            };
        }
        return info;
    }

    /**
     * Delete all streams (for testing cleanup)
     */
    deleteAllStreams() {
        const streamNames = Array.from(this.streams.keys());
        for (const name of streamNames) {
            try {
                this.deleteStream(name);
            } catch (error) {
                console.warn(`Error deleting stream ${name}:`, error);
            }
        }
        
        // Clear global subscribers as well
        this.globalSubscribers.clear();
        this.userSubscriptions.clear();
        this.nextSubscriptionId = 1;
    }
    
    /**
     * Subscribe to stream lifecycle events (created, deleted)
     * @param {Function} callback - Callback function (event, data) => void
     * @returns {Function} Unsubscribe function
     */
    onStreamEvent(callback) {
        this.streamEventCallbacks.add(callback);
        return () => this.streamEventCallbacks.delete(callback);
    }
    
    /**
     * Emit a stream event to all listeners
     * @param {string} event - Event type ('created' or 'deleted')
     * @param {Object} data - Event data
     * @private
     */
    _emitStreamEvent(event, data) {
        for (const callback of this.streamEventCallbacks) {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in stream event callback:', error);
            }
        }
    }
}

// Global instance for the application
export const streamManager = new StreamManager();