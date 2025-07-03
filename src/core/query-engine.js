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
     * Parse and execute a statement (command or flow)
     * Returns { type: 'command'|'query', queryId?, result?, error? }
     */
    async executeStatement(statementText) {
        const trimmed = statementText.trim();
        
        if (!trimmed) {
            return { type: 'empty', message: 'Empty statement' };
        }

        try {
            // Check if it's a regular command
            if (CommandParser.isCommand(trimmed)) {
                const command = CommandParser.extractCommand(trimmed);
                const result = await CommandParser.executeCommand(command);
                
                // Handle special case where command is actually a flow
                if (result.type === 'flow' && result.flowCommand) {
                    return await this.executeFlow(trimmed);
                }
                
                return result;
            }

            // Check if it's a flow definition
            if (CommandParser.isFlow(trimmed)) {
                return await this.executeFlow(trimmed);
            }

            // Otherwise, it's a simple query - execute as continuous stream query
            return await this.executeQuery(trimmed);
        } catch (error) {
            return {
                type: 'error',
                error: error.message,
                message: `Execution failed: ${error.message}`
            };
        }
    }

    /**
     * Execute a flow definition (create flow ... from ... | ...)
     */
    async executeFlow(flowText) {
        try {
            
            // Parse the flow command
            const flowInfo = CommandParser.parseFlowCommand(flowText);
            
            const { flowName, ttlSeconds, queryPart, modifier } = flowInfo;
            
            // Handle flow existence checking based on modifier
            const exists = this.flowExists(flowName);
            
            if (exists) {
                if (modifier === 'or_replace') {
                    // Delete existing flow first
                    const deleteResult = this.stopFlowByName(flowName);
                    if (!deleteResult.success) {
                        throw new Error(`Failed to delete existing flow '${flowName}': ${deleteResult.message}`);
                    }
                } else if (modifier === 'if_not_exists') {
                    // Flow exists, return success without action
                    return {
                        type: 'flow',
                        success: true,
                        flowName,
                        message: `Flow '${flowName}' already exists (no action taken)`
                    };
                } else {
                    // Regular create - should fail
                    throw new Error(`Flow '${flowName}' already exists. Use 'create or replace flow ${flowName}' to replace it or 'create if not exists flow ${flowName}' to ignore if exists.`);
                }
            }
            
            // Execute the query part
            const result = await this.executeQuery(queryPart);
            
            if (result.success) {
                // Store flow info with TTL if specified
                const queryInfo = this.activeQueries.get(result.queryId);
                if (queryInfo) {
                    queryInfo.flowName = flowName;
                    queryInfo.ttlSeconds = ttlSeconds;
                    queryInfo.type = 'flow';
                    
                    // Set up TTL deletion if specified
                    if (ttlSeconds) {
                        queryInfo.ttlTimeout = setTimeout(() => {
                            console.log(`⏰ Flow '${flowName}' TTL expired, deleting...`);
                            this.stopQuery(result.queryId);
                        }, ttlSeconds * 1000);
                    }
                }
                
                const action = modifier === 'or_replace' ? 'replaced' : 'created';
                return {
                    type: 'flow',
                    queryId: result.queryId,
                    flowName,
                    ttlSeconds,
                    sourceName: result.sourceName,
                    message: `Flow '${flowName}' ${action}${ttlSeconds ? ` with TTL ${ttlSeconds}s` : ''}`,
                    success: true
                };
            }
            
            return result;
        } catch (error) {
            return {
                type: 'flow',
                success: false,
                error: error.message,
                message: `Flow creation failed: ${error.message}`
            };
        }
    }

    /**
     * Execute a continuous query that subscribes to a stream
     */
    async executeQuery(queryText) {
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
                throw new Error(`Stream '${sourceName}' does not exist. Create it first with: create stream ${sourceName}`);
            }

            // Validate insert_into target streams exist
            const targetStreams = this.extractInsertIntoTargets(result.javascript);
            for (const targetStream of targetStreams) {
                if (!streamManager.hasStream(targetStream)) {
                    throw new Error(`Target stream '${targetStream}' does not exist. Create it first with: create stream ${targetStream}`);
                }
            }

            // Create a new query pipeline
            const queryId = this.nextQueryId++;
            const pipeline = this.createQueryPipeline(result.javascript);
            
            // Subscribe to the stream
            const subscriptionId = streamManager.subscribeFlowToStream(sourceName, pipeline, null);
            
            // Store query info
            const queryInfo = {
                queryId,
                subscriptionId,
                sourceName,
                queryText,
                pipeline,
                startTime: new Date(),
                isActive: true,
                type: 'query'
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
     * Stop a running query or flow
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

        // Clear TTL timeout if it exists
        if (queryInfo.ttlTimeout) {
            clearTimeout(queryInfo.ttlTimeout);
        }

        // Unsubscribe from stream
        streamManager.unsubscribeFlowFromStream(queryInfo.sourceName, queryInfo.subscriptionId);
        
        // Mark as inactive
        queryInfo.isActive = false;
        queryInfo.endTime = new Date();
        
        const itemType = queryInfo.type === 'flow' ? 'Flow' : 'Query';
        const itemName = queryInfo.flowName || queryId;
        
        return {
            success: true,
            message: `${itemType} ${itemName} stopped`
        };
    }

    /**
     * Get info about active queries and flows
     */
    getActiveQueries() {
        const active = [];
        for (const [queryId, info] of this.activeQueries) {
            if (info.isActive) {
                active.push({
                    queryId: info.queryId,
                    type: info.type || 'query',
                    flowName: info.flowName,
                    sourceName: info.sourceName,
                    queryText: info.queryText,
                    startTime: info.startTime,
                    duration: new Date() - info.startTime,
                    ttlSeconds: info.ttlSeconds
                });
            }
        }
        return active;
    }

    /**
     * Get info about active flows only
     */
    getActiveFlows() {
        const flows = [];
        for (const [queryId, info] of this.activeQueries) {
            if (info.isActive && info.type === 'flow') {
                flows.push({
                    queryId: info.queryId,
                    flowName: info.flowName,
                    sourceName: info.sourceName,
                    queryText: info.queryText,
                    startTime: info.startTime,
                    duration: new Date() - info.startTime,
                    ttlSeconds: info.ttlSeconds
                });
            }
        }
        return flows;
    }

    /**
     * Stop a flow by name
     */
    stopFlowByName(flowName) {
        for (const [queryId, info] of this.activeQueries) {
            if (info.isActive && info.type === 'flow' && info.flowName === flowName) {
                return this.stopQuery(queryId);
            }
        }
        
        return {
            success: false,
            message: `Flow '${flowName}' not found`
        };
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
     * Extract insert_into target stream names from transpiled JavaScript
     * Looks for patterns like "new Operators.InsertInto('streamName')"
     */
    extractInsertIntoTargets(jsCode) {
        const targets = [];
        
        // Match patterns like: new Operators.InsertInto('streamName')
        const insertIntoPattern = /new\s+Operators\.InsertInto\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
        
        let match;
        while ((match = insertIntoPattern.exec(jsCode)) !== null) {
            const streamName = match[1];
            if (!targets.includes(streamName)) {
                targets.push(streamName);
            }
        }
        
        return targets;
    }

    /**
     * Check if a flow with the given name already exists
     */
    flowExists(flowName) {
        for (const [queryId, info] of this.activeQueries) {
            if (info.isActive && info.type === 'flow' && info.flowName === flowName) {
                return true;
            }
        }
        return false;
    }

    /**
     * Create a query pipeline from transpiled JavaScript
     */
    createQueryPipeline(jsCode) {
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
            
            // No result callback needed - flows use insert_into to write results
            
            
            return pipeline;
        } catch (error) {
            throw new Error(`Failed to create pipeline: ${error.message}`);
        }
    }
}

// Global instance
export const queryEngine = new QueryEngine();