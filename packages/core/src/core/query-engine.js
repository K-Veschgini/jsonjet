import { Stream } from './stream.js';
import { QueryLexer } from '../parser/tokens/token-registry.js';
import { unifiedQueryParser } from '../parser/grammar/unified-query-parser.js';
import { unifiedTranspiler } from '../parser/transpiler/unified-transpiler.js';
import CommandParser from '../parser/command-parser.js';
import * as Operators from '../operators/index.js';
import { safeGet } from '../utils/safe-access.js';
import { Registry } from './registry.js';
import { registerServerFunctions } from '../functions/server-index.js';
import { AggregationObject } from '../aggregations/core/aggregation-object.js';
import { AggregationExpression, setFunctionRegistry } from '../aggregations/core/aggregation-expression.js';
import DurationParser from '../utils/duration-parser.js';

/**
 * Unified Query Engine - Handles both single statements and batch processing
 * Combines the functionality of QueryEngine and BatchQueryEngine
 */
export class QueryEngine {
    constructor(streamManagerInstance) {
        this.activeQueries = new Map(); // queryId -> QueryInfo
        this.nextQueryId = 1;
        this.streamManager = streamManagerInstance;
        this.flowCallbacks = new Set(); // Callbacks for flow lifecycle events
        
        // Create unified registry for this query engine instance
        this.registry = new Registry();
        registerServerFunctions(this.registry);
        
        // Set the function registry for AggregationExpression
        setFunctionRegistry(this.registry);
    }

    // =============================================================================
    // PRIMARY INTERFACE - Single Statement Execution
    // =============================================================================

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
                const result = await CommandParser.executeCommand(command, this.streamManager);
                return result;
            }

            // Check if it's a flow definition
            if (CommandParser.isFlow(trimmed)) {
                return await this.executeFlow(trimmed);
            }

            // Otherwise, it's a simple query - execute as continuous stream query
            return await this.executeQuery(trimmed);
        } catch (error) {
            this.streamManager?.initializeLogger();
            return this.streamManager?.logger?.createErrorResponse(
                'EXECUTION_FAILED',
                `Execution failed: ${error.message}`,
                trimmed
            ) || {
                success: false,
                error: {
                    code: 'EXECUTION_FAILED',
                    message: `Execution failed: ${error.message}`
                }
            };
        }
    }

    /**
     * Execute a flow definition from text
     */
    async executeFlow(flowText) {
        try {
            // Parse the flow using the unified parser instead of the old command parser
            const trimmed = flowText.trim();
            if (!trimmed) {
                return { type: 'flow', success: false, message: 'Empty flow statement' };
            }

            // Use unified parser to parse the flow statement
            const lexResult = QueryLexer.tokenize(trimmed);
            if (lexResult.errors.length > 0) {
                throw new Error(`Lexing errors: ${lexResult.errors.map(e => e.message).join(', ')}`);
            }

            const parseResult = unifiedQueryParser.parseProgram(lexResult.tokens);
            const executionPlan = unifiedTranspiler.transpileProgram(parseResult);
            
            if (executionPlan.statements.length !== 1) {
                throw new Error('Flow statement must contain exactly one statement');
            }

            const statement = executionPlan.statements[0];
            if (statement.type !== 'createStatement' || statement.ast.command !== 'create_flow') {
                throw new Error('Expected create flow statement');
            }

            // Now use the AST-based flow creation
            return await this.handleCreateFlow(statement.ast);
        } catch (error) {
            return {
                type: 'flow',
                success: false,
                message: `Failed to create flow: ${error.message}`
            };
        }
    }

    /**
     * Execute a continuous query that subscribes to a stream
     */
    async executeQuery(queryText) {
        try {
            // Strip trailing semicolons from query text before transpilation
            const cleanQueryText = queryText.trim().replace(/;+$/, '');
            
            // Use unified parser for consistency
            const lexResult = QueryLexer.tokenize(cleanQueryText);
            if (lexResult.errors.length > 0) {
                throw new Error(`Lexing errors: ${lexResult.errors.map(e => e.message).join(', ')}`);
            }

            const parseResult = unifiedQueryParser.parseProgram(lexResult.tokens);
            const executionPlan = unifiedTranspiler.transpileProgram(parseResult);
            
            // For single query execution, we expect exactly one statement
            if (executionPlan.statements.length !== 1) {
                throw new Error(`Expected single statement, got ${executionPlan.statements.length}`);
            }
            
            const statement = executionPlan.statements[0];
            
            if (statement.type === 'createStatement' && statement.ast.command === 'create_flow') {
                throw new Error('Use executeFlow() for flow creation statements');
            }
            
            // Generate JavaScript code for the pipeline
            const result = {
                javascript: executionPlan.javascript || this.pipelineToCode(statement.ast)
            };

            // Extract source name from the query
            const sourceName = this.extractSourceName(queryText);
            
            if (!this.streamManager.hasStream(sourceName)) {
                throw new Error(`Stream '${sourceName}' does not exist. Create it first with: create stream ${sourceName}`);
            }

            // Validate insert_into target streams exist
            const targetStreams = this.extractInsertIntoTargets(result.javascript);
            for (const targetStream of targetStreams) {
                if (!this.streamManager.hasStream(targetStream)) {
                    throw new Error(`Target stream '${targetStream}' does not exist. Create it first with: create stream ${targetStream}`);
                }
            }

            // Create a new query pipeline
            const queryId = this.nextQueryId++;
            const pipeline = this.createQueryPipeline(result.javascript);
            
            // Subscribe to the stream
            const subscriptionId = this.streamManager.subscribeFlowToStream(sourceName, pipeline, null);
            
            // Extract sink information from the query
            const sinks = this.extractSinksFromQuery(result.javascript);
            
            // Store query info
            const queryInfo = {
                queryId,
                subscriptionId,
                sourceName,
                queryText,
                pipeline,
                sinks,
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
            // Log the error to _log stream
            this.streamManager?.initializeLogger();
            this.streamManager?.logger?.error('QUERY_FAILED', error.message, queryText);
            
            return {
                type: 'query',
                success: false,
                error: error.message,
                message: `Query failed: ${error.message}`
            };
        }
    }

    // =============================================================================
    // BATCH PROCESSING INTERFACE
    // =============================================================================

    /**
     * Parse multiple statements from input text
     * Returns an array of parsed statement objects
     */
    parseStatements(input) {
        const trimmed = input.trim();
        if (!trimmed) {
            return [];
        }

        try {
            // Tokenize input
            const lexResult = QueryLexer.tokenize(trimmed);
            if (lexResult.errors.length > 0) {
                throw new Error(`Lexing errors: ${lexResult.errors.map(e => e.message).join(', ')}`);
            }

            // Parse with unified parser
            const parseResult = unifiedQueryParser.parseProgram(lexResult.tokens);
            
            // Transpile to get statement list
            const executionPlan = unifiedTranspiler.transpileProgram(parseResult);
            
            // Convert to simple statement objects
            return executionPlan.statements.map((stmt, index) => ({
                index,
                text: this.extractStatementText(input, stmt, index),
                type: this.getStatementType(stmt),
                isCommand: unifiedTranspiler.isCommand(stmt),
                isQuery: unifiedTranspiler.isQuery(stmt),
                ast: stmt
            }));

        } catch (error) {
            throw new Error(`Unified parsing failed: ${error.message}`);
        }
    }

    /**
     * Execute all statements in sequence
     * Returns execution results for each statement
     */
    async executeStatements(statements) {
        const results = [];

        for (const stmt of statements) {
            try {
                let result;
                if (stmt.isCommand) {
                    result = await this.executeCommand(stmt.ast);
                } else if (stmt.isQuery) {
                    result = await this.executeQueryAst(stmt.ast);
                } else {
                    result = await this.executeStatement(stmt.text);
                }

                results.push({
                    statement: stmt,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    statement: stmt,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Parse and execute input in one call
     */
    async executeInput(input) {
        const statements = this.parseStatements(input);
        return await this.executeStatements(statements);
    }

    /**
     * Execute a command AST
     */
    async executeCommand(ast) {
        if (!ast || !ast.ast) {
            throw new Error('Invalid AST structure');
        }
        const command = ast.ast.command;
        
        switch (command) {
            case 'create_stream':
                return await this.handleCreateStream(ast.ast);
            case 'create_flow':
                return await this.handleCreateFlow(ast.ast);
            case 'delete_stream':
                this.streamManager.deleteStream(ast.ast.streamName);
                return { success: true, message: `Stream '${ast.ast.streamName}' deleted` };
            case 'delete_flow':
                return this.stopFlowByName(ast.ast.flowName);
            case 'insert':
                let data = ast.ast.data;
                // If data is a string that looks like JSON, parse it
                if (typeof data === 'string' && (data.trim().startsWith('{') || data.trim().startsWith('['))) {
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        // If parsing fails, use the string as-is
                    }
                }
                await this.streamManager.insertIntoStream(ast.ast.streamName, data);
                return { success: true, message: 'Data inserted' };
            case 'flush':
                this.streamManager.flushStream(ast.ast.streamName);
                return { success: true, message: `Stream '${ast.ast.streamName}' flushed` };
            case 'list':
                if (ast.ast.target === 'flows') {
                    return { success: true, result: this.getActiveFlows() };
                } else {
                    return { success: true, result: this.streamManager.listStreams() };
                }
            case 'info':
                if (ast.ast.streamName) {
                    return { success: true, result: this.streamManager.getStreamInfo(ast.ast.streamName) };
                } else {
                    return { success: true, result: this.streamManager.getAllStreamInfo() };
                }
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    }

    /**
     * Execute a query AST
     */
    async executeQueryAst(ast) {
        if (ast.ast.command === 'create_flow') {
            return await this.handleCreateFlow(ast.ast);
        } else {
            // Delegate regular pipeline queries
            const queryText = this.pipelineToCode(ast.ast);
            return await this.executeQuery(queryText);
        }
    }

    // =============================================================================
    // QUERY MANAGEMENT
    // =============================================================================

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
        this.streamManager.unsubscribeFlowFromStream(queryInfo.sourceName, queryInfo.subscriptionId);
        
        // Mark as inactive
        queryInfo.isActive = false;
        queryInfo.endTime = new Date();
        
        // Notify flow deleted if it's a flow
        if (queryInfo.type === 'flow') {
            this.notifyFlowEvent('deleted', {
                queryId,
                flowName: queryInfo.flowName,
                source: { type: 'stream', name: queryInfo.sourceName },
                sinks: queryInfo.sinks || [],
                ttlSeconds: queryInfo.ttlSeconds,
                status: 'inactive',
                startTime: queryInfo.startTime
            });
        }
        
        const itemType = queryInfo.type === 'flow' ? 'Flow' : 'Query';
        const itemName = queryInfo.flowName || queryId;
        
        return {
            success: true,
            message: `${itemType} ${itemName} stopped`
        };
    }

    /**
     * Get active queries
     */
    getActiveQueries() {
        const activeQueries = [];
        for (const [queryId, info] of this.activeQueries) {
            if (info.isActive) {
                activeQueries.push({
                    queryId,
                    type: info.type,
                    flowName: info.flowName,
                    sourceName: info.sourceName,
                    startTime: info.startTime,
                    ttlSeconds: info.ttlSeconds,
                    sinks: info.sinks || []
                });
            }
        }
        return activeQueries;
    }

    /**
     * Get active flows
     */
    getActiveFlows() {
        const activeFlows = [];
        for (const [queryId, info] of this.activeQueries) {
            if (info.isActive && info.type === 'flow') {
                activeFlows.push({
                    queryId,
                    flowName: info.flowName,
                    sourceName: info.sourceName,
                    startTime: info.startTime,
                    ttlSeconds: info.ttlSeconds,
                    sinks: info.sinks || []
                });
            }
        }
        return activeFlows;
    }

    /**
     * Stop flow by name
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
     * Clean up inactive queries
     */
    cleanupQueries() {
        for (const [queryId, info] of this.activeQueries) {
            if (!info.isActive) {
                this.activeQueries.delete(queryId);
            }
        }
    }

    /**
     * Stop all active queries (for testing cleanup)
     */
    stopAllQueries() {
        const queryIds = Array.from(this.activeQueries.keys());
        for (const queryId of queryIds) {
            try {
                this.stopQuery(queryId);
            } catch (error) {
                console.warn(`Error stopping query ${queryId}:`, error);
            }
        }
    }

    /**
     * Check if flow exists
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
     * List active flows
     */
    listActiveFlows() {
        const flows = [];
        
        for (const [queryId, queryInfo] of this.activeQueries) {
            if (queryInfo.isActive && queryInfo.type === 'flow') {
                flows.push({
                    queryId,
                    flowName: queryInfo.flowName,
                    source: { type: 'stream', name: queryInfo.sourceName },
                    sinks: queryInfo.sinks || [],
                    ttlSeconds: queryInfo.ttlSeconds,
                    status: 'active',
                    startTime: queryInfo.startTime
                });
            }
        }
        
        return flows;
    }

    /**
     * Get flow info by name
     */
    getFlowInfo(flowName) {
        for (const [queryId, queryInfo] of this.activeQueries) {
            if (queryInfo.flowName === flowName && queryInfo.isActive) {
                return {
                    queryId,
                    flowName: queryInfo.flowName,
                    source: { type: 'stream', name: queryInfo.sourceName },
                    sinks: queryInfo.sinks || [],
                    ttlSeconds: queryInfo.ttlSeconds,
                    status: 'active',
                    startTime: queryInfo.startTime
                };
            }
        }
        
        return null;
    }

    /**
     * Get streams that write to a given stream
     */
    getStreamSources(streamName) {
        const sources = [];
        
        for (const [queryId, queryInfo] of this.activeQueries) {
            if (queryInfo.isActive && queryInfo.sinks) {
                const matchingSink = queryInfo.sinks.find(sink => sink.name === streamName);
                if (matchingSink) {
                    sources.push({
                        queryId,
                        flowName: queryInfo.flowName,
                        type: queryInfo.type,
                        sourceName: queryInfo.sourceName
                    });
                }
            }
        }
        
        return sources;
    }

    /**
     * Get streams that read from a given stream
     */
    getStreamSinks(streamName) {
        const sinks = [];
        
        for (const [queryId, queryInfo] of this.activeQueries) {
            if (queryInfo.isActive && queryInfo.sourceName === streamName) {
                sinks.push({
                    queryId,
                    flowName: queryInfo.flowName,
                    type: queryInfo.type,
                    sinks: queryInfo.sinks || []
                });
            }
        }
        
        return sinks;
    }

    /**
     * Subscribe to flow events
     */
    onFlowEvent(callback) {
        this.flowCallbacks.add(callback);
        return () => this.flowCallbacks.delete(callback);
    }

    /**
     * Notify flow event listeners
     */
    notifyFlowEvent(event, flowInfo) {
        for (const callback of this.flowCallbacks) {
            try {
                callback(event, flowInfo);
            } catch (error) {
                console.error('Error in flow event callback:', error);
            }
        }
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    /**
     * Extract source stream name from query text
     */
    extractSourceName(queryText) {
        const match = queryText.match(/^(\w+)\s*\|/);
        if (!match) {
            throw new Error('Invalid query format: must start with stream name');
        }
        return match[1];
    }

    /**
     * Extract insert_into target streams from JavaScript code
     */
    extractInsertIntoTargets(jsCode) {
        const targets = [];
        const insertIntoPattern = /insertIntoFactory\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
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
     * Create a query pipeline from transpiled JavaScript
     */
    createQueryPipeline(jsCode) {
        try {
            // Create a new stream and build the pipeline
            const stream = new Stream();
            
            // The transpiled code should be the pipeline operations
            const insertIntoFactory = (streamName) => {
                return new Operators.InsertInto(async (item) => {
                    await this.streamManager.insertIntoStream(streamName, item);
                });
            };
            
            const createPipeline = new Function('Stream', 'Operators', 'insertIntoFactory', 'safeGet', 'functionRegistry', 'AggregationObject', 'AggregationExpression', `
                const stream = new Stream();
                return stream${jsCode};
            `);
            
            const pipeline = createPipeline(Stream, Operators, insertIntoFactory, safeGet, this.registry, AggregationObject, AggregationExpression);
            
            return pipeline;
        } catch (error) {
            throw new Error(`Failed to create pipeline: ${error.message}`);
        }
    }

    /**
     * Extract sink information from JavaScript code
     */
    extractSinksFromQuery(jsCode) {
        const sinks = [];
        const insertIntoPattern = /insertIntoFactory\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
        let match;
        
        while ((match = insertIntoPattern.exec(jsCode)) !== null) {
            const streamName = match[1];
            sinks.push({
                type: 'stream',
                name: streamName
            });
        }
        
        return sinks;
    }

    // =============================================================================
    // BATCH PROCESSING UTILITY METHODS
    // =============================================================================

    async handleCreateStream(params) {
        const { streamName, modifier } = params;
        const exists = this.streamManager.hasStream(streamName);

        if (exists) {
            if (modifier === 'or_replace') {
                this.streamManager.deleteStream(streamName);
                this.streamManager.createStream(streamName);
                return { success: true, message: `Stream '${streamName}' replaced` };
            } else if (modifier === 'if_not_exists') {
                return { success: true, message: `Stream '${streamName}' already exists` };
            } else {
                throw new Error(`Stream '${streamName}' already exists`);
            }
        } else {
            this.streamManager.createStream(streamName);
            return { success: true, message: `Stream '${streamName}' created` };
        }
    }

    async handleCreateFlow(params) {
        const { flowName, modifier, ttlExpression, flowQuery } = params;
        
        const exists = this.flowExists(flowName);
        if (exists && modifier !== 'or_replace') {
            if (modifier === 'if_not_exists') {
                return { success: true, message: `Flow '${flowName}' already exists` };
            }
            throw new Error(`Flow '${flowName}' already exists`);
        }

        if (exists && modifier === 'or_replace') {
            this.stopFlowByName(flowName);
        }

        let ttlSeconds = null;
        if (ttlExpression) {
            ttlSeconds = DurationParser.parse(ttlExpression);
        }

        // Execute the flow using AST directly
        const result = await this.executeFlowFromAST(flowQuery, flowName);
        
        if (result.success) {
            const queryInfo = this.activeQueries.get(result.queryId);
            if (queryInfo) {
                queryInfo.type = 'flow';
                queryInfo.flowName = flowName;
                queryInfo.ttlSeconds = ttlSeconds;
                
                if (ttlSeconds) {
                    queryInfo.ttlTimeout = setTimeout(() => {
                        this.stopQuery(result.queryId);
                    }, ttlSeconds * 1000);
                }

                this.notifyFlowEvent('created', {
                    queryId: result.queryId,
                    flowName,
                    source: { type: 'stream', name: queryInfo.sourceName },
                    sinks: queryInfo.sinks || [],
                    ttlSeconds,
                    status: 'active',
                    startTime: queryInfo.startTime
                });
            }

            return {
                type: 'flow',
                queryId: result.queryId,
                flowName,
                ttlSeconds,
                sourceName: result.sourceName,
                message: `Flow '${flowName}' created`,
                success: true
            };
        }

        throw new Error(`Failed to create flow: ${result.message}`);
    }

    pipelineToCode(pipelineAst) {
        if (!pipelineAst || !pipelineAst.children) {
            return '';
        }

        let code = '';

        // Extract source stream
        if (pipelineAst.children.source && pipelineAst.children.source[0]) {
            code += pipelineAst.children.source[0].image;
        }

        // Add operations
        if (pipelineAst.children.operation) {
            for (const opNode of pipelineAst.children.operation) {
                code += ' | ' + this.operationToCode(opNode);
            }
        }

        return code;
    }

    operationToCode(operationNode) {
        if (!operationNode || !operationNode.children) {
            return '';
        }

        // Check which operation type this is
        if (operationNode.children.whereClause) {
            return this.whereClauseToCode(operationNode.children.whereClause[0]);
        }
        if (operationNode.children.selectClause) {
            return this.selectClauseToCode(operationNode.children.selectClause[0]);
        }
        if (operationNode.children.scanClause) {
            return this.scanClauseToCode(operationNode.children.scanClause[0]);
        }
        if (operationNode.children.summarizeClause) {
            return this.summarizeClauseToCode(operationNode.children.summarizeClause[0]);
        }
        if (operationNode.children.insertIntoClause) {
            return this.insertIntoClauseToCode(operationNode.children.insertIntoClause[0]);
        }
        if (operationNode.children.writeToFileClause) {
            return this.writeToFileClauseToCode(operationNode.children.writeToFileClause[0]);
        }
        if (operationNode.children.assertOrSaveExpectedClause) {
            return this.assertOrSaveExpectedClauseToCode(operationNode.children.assertOrSaveExpectedClause[0]);
        }
        if (operationNode.children.collectClause) {
            return 'collect()';
        }

        return 'unknown_operation';
    }

    whereClauseToCode(whereNode) {
        return `where ${this.expressionToCode(whereNode.children.expression[0])}`;
    }

    selectClauseToCode(selectNode) {
        return `select ${this.selectObjectToCode(selectNode.children.selectObject[0])}`;
    }

    scanClauseToCode(scanNode) {
        if (!scanNode || !scanNode.children) {
            return 'scan()';
        }

        let scanCode = 'scan(';
        
        // Add declare section if present
        if (scanNode.children.declareSection) {
            scanCode += 'declare (...), ';
        }

        // Add step definitions
        if (scanNode.children.stepList) {
            const stepList = scanNode.children.stepList[0];
            if (stepList.children && stepList.children.stepDefinition) {
                const steps = stepList.children.stepDefinition;
                for (let i = 0; i < steps.length; i++) {
                    if (i > 0) scanCode += ', ';
                    scanCode += this.stepDefinitionToCode(steps[i]);
                }
            }
        }

        scanCode += ')';
        return scanCode;
    }

    stepDefinitionToCode(stepNode) {
        if (!stepNode || !stepNode.children) {
            return 'step: true => {}';
        }

        let stepCode = 'step ';
        
        // Add step name if present
        if (stepNode.children.stepName) {
            stepCode += stepNode.children.stepName[0].image + ': ';
        }

        // Add step condition
        if (stepNode.children.stepCondition) {
            stepCode += this.expressionToCode(stepNode.children.stepCondition[0]);
        } else {
            stepCode += 'true';
        }

        stepCode += ' => {';

        // Add statements
        if (stepNode.children.statementList) {
            stepCode += ' /* statements */ ';
        }

        stepCode += '}';
        return stepCode;
    }

    summarizeClauseToCode(summarizeNode) {
        return 'summarize(...)';
    }

    insertIntoClauseToCode(insertIntoNode) {
        return `insert_into(${insertIntoNode.children.streamName[0].image})`;
    }

    writeToFileClauseToCode(writeToFileNode) {
        return 'write_to_file(...)';
    }

    assertOrSaveExpectedClauseToCode(assertNode) {
        return 'assert_or_save_expected(...)';
    }

    selectObjectToCode(selectObjectNode) {
        return '{ /* fields */ }';
    }

    expressionToCode(expressionNode) {
        if (!expressionNode || !expressionNode.children) {
            return 'true';
        }

        // Simplified expression handling
        if (expressionNode.children.primaryExpression) {
            return this.primaryExpressionToCode(expressionNode.children.primaryExpression[0]);
        }

        return 'expression';
    }

    primaryExpressionToCode(primaryNode) {
        if (!primaryNode || !primaryNode.children) {
            return 'value';
        }
        
        if (primaryNode.children.stringLiteral) {
            return primaryNode.children.stringLiteral[0].image;
        }
        if (primaryNode.children.durationLiteral) {
            return primaryNode.children.durationLiteral[0].image;
        }
        if (primaryNode.children.numberLiteral) {
            return primaryNode.children.numberLiteral[0].image;
        }
        if (primaryNode.children.booleanLiteral) {
            return primaryNode.children.booleanLiteral[0].image;
        }
        if (primaryNode.children.nullLiteral) {
            return 'null';
        }
        if (primaryNode.children.identifier) {
            return primaryNode.children.identifier[0].image;
        }

        return 'value';
    }

    getStatementType(stmt) {
        if (stmt.type === 'createStatement') {
            if (stmt.ast.command === 'create_stream') {
                return 'create_stream';
            } else if (stmt.ast.command === 'create_flow') {
                return 'create_flow';
            }
        }
        return 'unknown';
    }

    extractStatementText(input, stmt, index) {
        // Since we're using the unified parser, we can use the transpiler's 
        // regeneration capability to get clean statement text
        try {
            if (stmt.type === 'createStatement') {
                if (stmt.ast.command === 'create_stream') {
                    const modifier = stmt.ast.modifier ? `${stmt.ast.modifier} ` : '';
                    return `create ${modifier}stream ${stmt.ast.streamName}`;
                } else if (stmt.ast.command === 'create_flow') {
                    // Extract the original flow statement text directly from input
                    return this._extractOriginalFlowText(input, stmt.ast.flowName) || `statement_${index}`;
                }
            }
            
            // For other statement types, try to reconstruct from AST
            if (stmt.ast && stmt.type) {
                switch (stmt.type) {
                    case 'insertStatement':
                        return `insert into ${stmt.ast.streamName} ${JSON.stringify(stmt.ast.data)}`;
                    case 'deleteStatement':
                        return `delete ${stmt.ast.target} ${stmt.ast.name}`;
                    case 'flushStatement':
                        return `flush ${stmt.ast.streamName}`;
                    case 'listStatement':
                        return `list ${stmt.ast.target}`;
                    case 'infoStatement':
                        return stmt.ast.streamName ? `info ${stmt.ast.streamName}` : 'info';
                    default:
                        return this.pipelineToCode(stmt.ast);
                }
            }
            
            return `statement_${index}`;
        } catch (error) {
            // Fallback to generic name if reconstruction fails
            return `statement_${index}`;
        }
    }

    /**
     * Extract the complete original flow statement text from input
     */
    _extractOriginalFlowText(input, flowName) {
        try {
            // Find the complete flow creation statement
            const flowRegex = new RegExp(
                `(create\\s+(?:(?:or\\s+replace|if\\s+not\\s+exists)\\s+)?flow\\s+${flowName}(?:\\s+ttl\\s*\\([^)]+\\))?\\s+as\\s+[\\s\\S]*?)(?=;|$)`,
                'i'
            );
            
            const match = input.match(flowRegex);
            if (match && match[1]) {
                return match[1].trim();
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }



    /**
     * Execute a flow directly from AST without reconstructing syntax
     */
    async executeFlowFromAST(flowQuery, flowName) {
        try {
            if (!flowQuery || !flowQuery.source) {
                throw new Error('Invalid flow query: missing source');
            }

            const sourceName = flowQuery.source.sourceName;
            
            if (!this.streamManager.hasStream(sourceName)) {
                throw new Error(`Stream '${sourceName}' does not exist. Create it first with: create stream ${sourceName}`);
            }

            // Create pipeline directly from the operations
            const queryId = this.nextQueryId++;
            const pipeline = this.createFlowPipeline(flowQuery);
            
            // Subscribe to the stream
            const subscriptionId = this.streamManager.subscribeFlowToStream(sourceName, pipeline, null);
            
            // Extract sink information
            const sinks = this.extractSinksFromFlowQuery(flowQuery);
            
            // Store query info
            const queryInfo = {
                queryId,
                subscriptionId,
                sourceName,
                queryText: flowQuery?.source?.sourceName || 'unknown', // For display purposes
                pipeline,
                sinks,
                startTime: new Date(),
                isActive: true,
                type: 'query' // Will be updated to 'flow' by caller
            };
            
            this.activeQueries.set(queryId, queryInfo);
            
            return {
                type: 'query',
                queryId,
                sourceName,
                message: `Flow pipeline created successfully`,
                success: true
            };
        } catch (error) {
            this.streamManager?.initializeLogger();
            this.streamManager?.logger?.error('FLOW_CREATION_FAILED', error.message, flowName);
            
            return {
                type: 'query',
                success: false,
                error: error.message,
                message: `Flow creation failed: ${error.message}`
            };
        }
    }

    /**
     * Create a pipeline directly from flow query AST
     */
    createFlowPipeline(flowQuery) {
        try {
            const stream = new Stream();
            
            // Convert the operations to actual pipeline operations
            if (flowQuery.operations && flowQuery.operations.length > 0) {
                let pipeline = stream;
                
                for (const operation of flowQuery.operations) {
                    if (typeof operation === 'string') {
                        // Evaluate the operation string to create the actual operator
                        // This is safe because the operations are generated by our own transpiler
                        const insertIntoFactory = (streamName) => {
                            return new Operators.InsertInto(async (item) => {
                                await this.streamManager.insertIntoStream(streamName, item);
                            });
                        };
                        
                        // Create a function that applies the operation
                        const applyOperation = new Function(
                            'pipeline', 'Operators', 'insertIntoFactory', 'safeGet', 'functionRegistry', 'AggregationObject', 'AggregationExpression',
                            `return pipeline${operation};`
                        );
                        
                        pipeline = applyOperation(pipeline, Operators, insertIntoFactory, safeGet, this.registry, AggregationObject, AggregationExpression);
                    }
                }
                
                return pipeline;
            }
            
            return stream;
        } catch (error) {
            throw new Error(`Failed to create flow pipeline: ${error.message}`);
        }
    }

    /**
     * Extract sink information from flow query AST
     */
    extractSinksFromFlowQuery(flowQuery) {
        const sinks = [];
        
        if (flowQuery.operations) {
            for (const operation of flowQuery.operations) {
                if (typeof operation === 'string' && operation.includes('InsertInto')) {
                    // Extract stream name from insertIntoFactory call
                    const match = operation.match(/insertIntoFactory\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/);
                    if (match) {
                        sinks.push({
                            type: 'stream',
                            name: match[1]
                        });
                    }
                }
            }
        }
        
        return sinks;
    }
} 