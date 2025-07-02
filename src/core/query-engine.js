import { Stream } from './stream.js';
import { streamManager } from './stream-manager.js';
import { transpileQuery } from '../parser/query-transpiler.js';
import CommandParser from '../parser/command-parser.js';
import * as Operators from '../operators/index.js';

/**
 * QueryEngine - Handles both commands and continuous queries
 */
export class QueryEngine {
    constructor() {
        this.activeQueries = new Map(); // queryId -> QueryInfo
        this.nextQueryId = 1;
    }

    /**
     * Parse and execute a statement (command or query)
     * Returns { type: 'command'|'query', queryId?, result?, error? }
     */
    async executeStatement(statementText, resultCallback) {
        const trimmed = statementText.trim();
        
        if (!trimmed) {
            return { type: 'empty', message: 'Empty statement' };
        }

        try {
            // Check if it's a dot command
            if (CommandParser.isCommand(trimmed)) {
                const command = CommandParser.extractCommand(trimmed);
                return await CommandParser.executeCommand(command);
            }

            // Otherwise, it's a query - execute as continuous stream query
            return await this.executeQuery(trimmed, resultCallback);
        } catch (error) {
            return {
                type: 'error',
                error: error.message,
                message: `Execution failed: ${error.message}`
            };
        }
    }

    /**
     * Execute a continuous query that subscribes to a stream
     */
    async executeQuery(queryText, resultCallback) {
        try {
            // Parse and transpile the query
            const result = transpileQuery(queryText);
            
            if (result.javascript.type === 'dotCommand') {
                // This shouldn't happen as dot commands are handled above
                throw new Error('Unexpected dot command in query execution');
            }

            // Extract source name from the query
            const sourceName = this.extractSourceName(queryText);
            
            if (!streamManager.hasStream(sourceName)) {
                throw new Error(`Stream '${sourceName}' does not exist. Create it first with: .create stream ${sourceName}`);
            }

            // Create a new query pipeline
            const queryId = this.nextQueryId++;
            const pipeline = this.createQueryPipeline(result.javascript, resultCallback);
            
            // Subscribe to the stream
            const subscriptionId = streamManager.subscribeToStream(sourceName, pipeline, resultCallback);
            
            // Store query info
            const queryInfo = {
                queryId,
                subscriptionId,
                sourceName,
                queryText,
                pipeline,
                resultCallback,
                startTime: new Date(),
                isActive: true
            };
            
            this.activeQueries.set(queryId, queryInfo);
            
            return {
                type: 'query',
                queryId,
                sourceName,
                message: `Query ${queryId} started on stream '${sourceName}'`,
                success: true
            };
        } catch (error) {
            return {
                type: 'query',
                success: false,
                error: error.message,
                message: `Query failed: ${error.message}`
            };
        }
    }

    /**
     * Stop a running query
     */
    stopQuery(queryId) {
        const queryInfo = this.activeQueries.get(queryId);
        if (!queryInfo) {
            return {
                success: false,
                message: `Query ${queryId} not found`
            };
        }

        if (!queryInfo.isActive) {
            return {
                success: false,
                message: `Query ${queryId} is already stopped`
            };
        }

        // Unsubscribe from stream
        streamManager.unsubscribeFromStream(queryInfo.sourceName, queryInfo.subscriptionId);
        
        // Mark as inactive
        queryInfo.isActive = false;
        queryInfo.endTime = new Date();
        
        return {
            success: true,
            message: `Query ${queryId} stopped`
        };
    }

    /**
     * Get info about active queries
     */
    getActiveQueries() {
        const active = [];
        for (const [queryId, info] of this.activeQueries) {
            if (info.isActive) {
                active.push({
                    queryId: info.queryId,
                    sourceName: info.sourceName,
                    queryText: info.queryText,
                    startTime: info.startTime,
                    duration: new Date() - info.startTime
                });
            }
        }
        return active;
    }

    /**
     * Clean up finished queries
     */
    cleanupQueries() {
        for (const [queryId, info] of this.activeQueries) {
            if (!info.isActive) {
                this.activeQueries.delete(queryId);
            }
        }
    }

    /**
     * Extract source name from query text
     * Simple implementation - assumes first word is the source
     */
    extractSourceName(queryText) {
        const trimmed = queryText.trim();
        const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (!match) {
            throw new Error('Could not determine source name from query');
        }
        return match[1];
    }

    /**
     * Create a query pipeline from transpiled JavaScript
     */
    createQueryPipeline(jsCode, resultCallback) {
        try {
            // Create a new stream and build the pipeline
            const stream = new Stream();
            
            // The transpiled code should be the pipeline operations
            // We need to execute it in the context where Operators is available
            const createPipeline = new Function('Stream', 'Operators', `
                const stream = new Stream();
                return stream${jsCode};
            `);
            
            const pipeline = createPipeline(Stream, Operators);
            return pipeline;
        } catch (error) {
            throw new Error(`Failed to create pipeline: ${error.message}`);
        }
    }
}

// Global instance
export const queryEngine = new QueryEngine();