import { Stream } from './stream.js';

/**
 * StreamManager - Manages named streams like MongoDB collections
 * Streams persist until explicitly deleted and can have multiple subscribers
 */
export class StreamManager {
    constructor() {
        this.streams = new Map(); // name -> StreamContainer
        this.nextQueryId = 1;
    }

    /**
     * Create a new named stream
     */
    createStream(name) {
        if (this.streams.has(name)) {
            throw new Error(`Stream '${name}' already exists`);
        }

        const streamContainer = {
            name,
            stream: new Stream(),
            subscribers: new Map(), // queryId -> { pipeline, callback }
            data: [] // Store data for new subscribers
        };

        this.streams.set(name, streamContainer);
        return streamContainer;
    }

    /**
     * Delete a stream and clean up all subscribers
     */
    deleteStream(name) {
        const container = this.streams.get(name);
        if (!container) {
            throw new Error(`Stream '${name}' does not exist`);
        }

        // Stop all active queries on this stream
        for (const [queryId, { pipeline }] of container.subscribers) {
            try {
                pipeline.finish(); // Gracefully finish the pipeline
            } catch (error) {
                console.warn(`Error finishing pipeline ${queryId}:`, error);
            }
        }

        container.subscribers.clear();
        this.streams.delete(name);
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
     * Data flows immediately to all active subscribers
     */
    async insertIntoStream(name, data) {
        const container = this.streams.get(name);
        if (!container) {
            throw new Error(`Stream '${name}' does not exist`);
        }

        // Handle bulk insert (array) or single insert
        const items = Array.isArray(data) ? data : [data];
        
        // Store data for potential new subscribers
        container.data.push(...items);

        // If no active subscribers, data is just stored
        if (container.subscribers.size === 0) {
            return;
        }

        // Push data to all active subscribers immediately
        for (const item of items) {
            for (const [queryId, { pipeline }] of container.subscribers) {
                try {
                    pipeline.push(item);
                } catch (error) {
                    console.error(`Error pushing to query ${queryId}:`, error);
                    // Remove failed subscriber
                    container.subscribers.delete(queryId);
                }
            }
        }
    }

    /**
     * Flush (clear) all data from a stream
     * Active queries continue but with no historical data
     */
    flushStream(name) {
        const container = this.streams.get(name);
        if (!container) {
            throw new Error(`Stream '${name}' does not exist`);
        }

        container.data = [];
        // Note: We don't interrupt active queries, they just won't see historical data
    }

    /**
     * Subscribe a query pipeline to a stream
     * Returns a query ID that can be used to unsubscribe
     */
    subscribeToStream(name, pipeline, callback) {
        const container = this.streams.get(name);
        if (!container) {
            throw new Error(`Stream '${name}' does not exist`);
        }

        const queryId = this.nextQueryId++;
        
        // Set up the pipeline callback to forward results
        pipeline.collect(callback);

        // Store subscriber info
        container.subscribers.set(queryId, { pipeline, callback });

        // Immediately send any existing data to the new subscriber
        if (container.data.length > 0) {
            for (const item of container.data) {
                try {
                    pipeline.push(item);
                } catch (error) {
                    console.error(`Error pushing historical data to query ${queryId}:`, error);
                    container.subscribers.delete(queryId);
                    throw error;
                }
            }
        }

        return queryId;
    }

    /**
     * Unsubscribe a query from a stream
     */
    unsubscribeFromStream(name, queryId) {
        const container = this.streams.get(name);
        if (!container) {
            return false;
        }

        const subscriber = container.subscribers.get(queryId);
        if (subscriber) {
            try {
                subscriber.pipeline.finish();
            } catch (error) {
                console.warn(`Error finishing pipeline ${queryId}:`, error);
            }
            container.subscribers.delete(queryId);
            return true;
        }

        return false;
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
            dataCount: container.data.length,
            subscriberCount: container.subscribers.size,
            subscribers: Array.from(container.subscribers.keys())
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
                dataCount: container.data.length,
                subscriberCount: container.subscribers.size,
                subscribers: Array.from(container.subscribers.keys())
            };
        }
        return info;
    }
}

// Global instance for the application
export const streamManager = new StreamManager();