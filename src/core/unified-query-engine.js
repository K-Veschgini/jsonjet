import { createQueryLexer } from '../parser/lexer/lexer-factory.js';
import { unifiedQueryParser } from '../parser/grammar/unified-query-parser.js';
import { unifiedTranspiler } from '../parser/transpiler/unified-transpiler.js';
import { CommandParser } from '../parser/command-parser.js';
import { QueryEngine } from './query-engine.js';

/**
 * Unified Query Engine - Single entry point for all statement types
 * Replaces the dual parsing system with unified grammar-based approach
 */
export class UnifiedQueryEngine {
    constructor(streamManager) {
        this.streamManager = streamManager;
        this.queryExecutor = new QueryEngine(streamManager);
        this.activeFlows = new Map();
    }

    /**
     * Execute a single statement or multiple statements
     * Automatically detects and handles both cases
     */
    async executeInput(input) {
        const trimmed = input.trim();
        if (!trimmed) {
            return { type: 'empty', success: true };
        }

        try {
            // Tokenize input with context-sensitive lexer
            const contextSensitiveLexer = createQueryLexer();
            const lexResult = contextSensitiveLexer.tokenize(trimmed);
            if (lexResult.errors.length > 0) {
                throw new Error(`Lexing errors: ${lexResult.errors.map(e => e.message).join(', ')}`);
            }

            // Parse with unified parser
            const parseResult = unifiedQueryParser.parseAuto(lexResult.tokens);
            
            // Transpile to execution plan
            let executionPlan;
            if (parseResult.type === 'program') {
                executionPlan = unifiedTranspiler.transpileProgram(parseResult.cst);
            } else {
                executionPlan = unifiedTranspiler.transpileStatement(parseResult.cst);
            }

            // Execute the plan
            return await this.executeExecutionPlan(executionPlan);

        } catch (error) {
            return {
                type: 'error',
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute a parsed execution plan
     */
    async executeExecutionPlan(plan) {
        if (plan.type === 'program') {
            return await this.executeProgram(plan);
        } else {
            return await this.executeStatement(plan);
        }
    }

    /**
     * Execute multiple statements as a batch
     */
    async executeProgram(plan) {
        const results = [];
        let hasErrors = false;

        for (const stmt of plan.statements) {
            try {
                const stmtPlan = {
                    type: 'statement',
                    statement: stmt,
                    isCommand: unifiedTranspiler.isCommand(stmt),
                    isQuery: unifiedTranspiler.isQuery(stmt)
                };

                const result = await this.executeStatement(stmtPlan);
                results.push(result);

                if (!result.success) {
                    hasErrors = true;
                }
            } catch (error) {
                const errorResult = {
                    type: 'error',
                    success: false,
                    error: error.message,
                    statement: stmt
                };
                results.push(errorResult);
                hasErrors = true;
            }
        }

        return {
            type: 'program',
            success: !hasErrors,
            totalStatements: plan.statements.length,
            results,
            summary: this.createExecutionSummary(results)
        };
    }

    /**
     * Execute a single statement
     */
    async executeStatement(plan) {
        const stmt = plan.statement;

        if (plan.isCommand) {
            return await this.executeCommand(stmt);
        } else if (plan.isQuery) {
            return await this.executeQuery(stmt);
        } else {
            throw new Error(`Unknown statement type: ${stmt.type}`);
        }
    }

    /**
     * Execute a command statement
     */
    async executeCommand(stmt) {
        const executable = unifiedTranspiler.commandToExecutable(stmt);
        const command = executable.command;
        const params = executable.params;

        switch (command) {
            case 'create_stream':
                return await this.handleCreateStream(params);
            case 'create_flow':
                return await this.handleCreateFlow(params);
            case 'delete_stream':
                return await this.handleDeleteStream(params);
            case 'delete_flow':
                return await this.handleDeleteFlow(params);
            case 'insert':
                return await this.handleInsert(params);
            case 'flush':
                return await this.handleFlush(params);
            case 'list':
                return await this.handleList(params);
            case 'info':
                return await this.handleInfo(params);
            case 'subscribe':
                return await this.handleSubscribe(params);
            case 'unsubscribe':
                return await this.handleUnsubscribe(params);
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    }

    /**
     * Execute a query statement
     */
    async executeQuery(stmt) {
        const executable = unifiedTranspiler.queryToExecutable(stmt);

        if (executable.type === 'create_flow') {
            // Handle flow creation
            return await this.handleCreateFlow({
                flowName: executable.flowName,
                modifier: executable.modifier,
                ttlExpression: executable.ttlExpression,
                queryCode: executable.queryCode
            });
        } else {
            // Execute regular query
            return await this.queryExecutor.executeQuery(executable.code);
        }
    }

    // =============================================================================
    // COMMAND HANDLERS
    // =============================================================================

    async handleCreateStream(params) {
        const { streamName, modifier } = params;

        const exists = this.streamManager.hasStream(streamName);

        if (exists) {
            if (modifier === 'or_replace') {
                this.streamManager.deleteStream(streamName);
                this.streamManager.createStream(streamName);
                return {
                    type: 'command',
                    success: true,
                    message: `Stream '${streamName}' replaced successfully`
                };
            } else if (modifier === 'if_not_exists') {
                return {
                    type: 'command',
                    success: true,
                    message: `Stream '${streamName}' already exists (no action taken)`
                };
            } else {
                throw new Error(`Stream '${streamName}' already exists`);
            }
        } else {
            this.streamManager.createStream(streamName);
            return {
                type: 'command',
                success: true,
                message: `Stream '${streamName}' created successfully`
            };
        }
    }

    async handleCreateFlow(params) {
        const { flowName, modifier, ttlExpression, queryCode } = params;
        
        // Use legacy query engine for flow creation for now
        const flowCommand = this.buildFlowCommand(flowName, modifier, ttlExpression, queryCode);
        return await this.queryExecutor.executeStatement(flowCommand);
    }

    async handleDeleteStream(params) {
        const { streamName } = params;
        this.streamManager.deleteStream(streamName);
        return {
            type: 'command',
            success: true,
            message: `Stream '${streamName}' deleted successfully`
        };
    }

    async handleDeleteFlow(params) {
        const { flowName } = params;
        const result = this.queryExecutor.stopFlowByName(flowName);
        return {
            type: 'command',
            success: result.success,
            message: result.message
        };
    }

    async handleInsert(params) {
        const { streamName, data } = params;
        await this.streamManager.insertIntoStream(streamName, data);
        return {
            type: 'command',
            success: true,
            message: `Data inserted into stream '${streamName}'`
        };
    }

    async handleFlush(params) {
        const { streamName } = params;
        this.streamManager.flushStream(streamName);
        return {
            type: 'command',
            success: true,
            message: `Stream '${streamName}' flushed successfully`
        };
    }

    async handleList(params) {
        const { target } = params;
        
        if (target === 'flows') {
            const flows = this.queryExecutor.getActiveFlows();
            return {
                type: 'command',
                success: true,
                message: `Found ${flows.length} active flow(s)`,
                result: flows
            };
        } else {
            const streams = this.streamManager.listStreams();
            return {
                type: 'command',
                success: true,
                message: `Found ${streams.length} stream(s)`,
                result: streams
            };
        }
    }

    async handleInfo(params) {
        const { streamName } = params;
        
        if (streamName) {
            const info = this.streamManager.getStreamInfo(streamName);
            return {
                type: 'command',
                success: true,
                message: `Stream '${streamName}' info retrieved`,
                result: info
            };
        } else {
            const info = this.streamManager.getAllStreamInfo();
            return {
                type: 'command',
                success: true,
                message: 'All stream info retrieved',
                result: info
            };
        }
    }

    async handleSubscribe(params) {
        const { streamName } = params;
        
        const subscriptionId = this.streamManager.subscribeToStream(streamName, 
            (message) => {
                const { data, streamName: actualStreamName } = message;
                console.log(`📡 [${actualStreamName}]:`, data);
            }
        );
        
        return {
            type: 'command',
            success: true,
            message: `Subscribed to stream '${streamName}' with ID ${subscriptionId}`,
            result: { subscriptionId }
        };
    }

    async handleUnsubscribe(params) {
        const { subscriptionId } = params;
        const success = this.streamManager.unsubscribeFromStream(subscriptionId);
        
        return {
            type: 'command',
            success,
            message: success 
                ? `Unsubscribed from subscription ID ${subscriptionId}`
                : `Subscription ID ${subscriptionId} not found`
        };
    }

    // =============================================================================
    // HELPER METHODS
    // =============================================================================

    buildFlowCommand(flowName, modifier, ttlExpression, queryCode) {
        let command = 'create ';
        
        if (modifier === 'or_replace') {
            command += 'or replace ';
        } else if (modifier === 'if_not_exists') {
            command += 'if not exists ';
        }
        
        command += `flow ${flowName}`;
        
        if (ttlExpression) {
            command += ` ttl(${ttlExpression})`;
        }
        
        command += ` as ${queryCode}`;
        
        return command;
    }

    createExecutionSummary(results) {
        const summary = {
            total: results.length,
            successful: 0,
            failed: 0,
            commands: 0,
            queries: 0,
            errors: []
        };

        for (const result of results) {
            if (result.success) {
                summary.successful++;
            } else {
                summary.failed++;
                if (result.error) {
                    summary.errors.push(result.error);
                }
            }

            if (result.type === 'command') {
                summary.commands++;
            } else if (result.type === 'query') {
                summary.queries++;
            }
        }

        return summary;
    }


    // =============================================================================
    // PUBLIC API
    // =============================================================================

    /**
     * Public API method for executing statements
     */
    async executeStatement(input) {
        return await this.executeInput(input);
    }

    getActiveFlows() {
        return this.queryExecutor.getActiveFlows();
    }

    stopFlowByName(flowName) {
        return this.queryExecutor.stopFlowByName(flowName);
    }
}

export default UnifiedQueryEngine;