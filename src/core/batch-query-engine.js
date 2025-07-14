import { QueryLexer } from '../parser/tokens/token-registry.js';
import { unifiedQueryParser } from '../parser/grammar/unified-query-parser.js';
import { unifiedTranspiler } from '../parser/transpiler/unified-transpiler.js';
import { QueryEngine } from './query-engine.js';

/**
 * Batch Query Engine - Simplified interface for parsing and executing multiple statements
 * Eliminates the need for manual statement splitting in test runners and editors
 */
export class BatchQueryEngine {
    constructor(streamManager) {
        this.streamManager = streamManager;
        this.queryEngine = new QueryEngine(streamManager);
    }

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
                    result = await this.executeQuery(stmt.ast);
                } else {
                    result = await this.queryEngine.executeStatement(stmt.text);
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
                return this.queryEngine.stopFlowByName(ast.ast.flowName);
            case 'insert':
                await this.streamManager.insertIntoStream(ast.ast.streamName, ast.ast.data);
                return { success: true, message: 'Data inserted' };
            case 'flush':
                this.streamManager.flushStream(ast.ast.streamName);
                return { success: true, message: `Stream '${ast.ast.streamName}' flushed` };
            case 'list':
                if (ast.ast.target === 'flows') {
                    return { success: true, result: this.queryEngine.getActiveFlows() };
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
    async executeQuery(ast) {
        if (ast.ast.command === 'create_flow') {
            return await this.handleCreateFlow(ast.ast);
        } else {
            throw new Error('Regular pipeline queries not yet implemented in unified system');
        }
    }

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
        
        // Build flow command
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
        command += ` as ${this.pipelineToCode(flowQuery)}`;
        
        return await this.queryEngine.executeStatement(command);
    }

    pipelineToCode(pipelineAst) {
        if (!pipelineAst || !pipelineAst.children) {
            return '';
        }

        // Extract source
        let code = '';
        if (pipelineAst.children.source && pipelineAst.children.source[0]) {
            const sourceNode = pipelineAst.children.source[0];
            code = sourceNode.children.sourceName[0].image;
        }

        // Extract operations
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
            return 'scan(...)';
        }

        // For now, return a basic scan structure
        // This is simplified and would need full implementation for complex scans
        let scanCode = 'scan(';
        
        if (scanNode.children.stepList) {
            const stepList = scanNode.children.stepList[0];
            if (stepList.children && stepList.children.stepDefinition) {
                const steps = stepList.children.stepDefinition;
                for (let i = 0; i < steps.length; i++) {
                    if (i > 0) scanCode += '; ';
                    scanCode += this.stepDefinitionToCode(steps[i]);
                }
            }
        }
        
        scanCode += ')';
        return scanCode;
    }

    stepDefinitionToCode(stepNode) {
        if (!stepNode || !stepNode.children) {
            return 'step: true => x = 1';
        }

        let stepCode = 'step ';
        
        // Get step name
        if (stepNode.children.stepName) {
            stepCode += stepNode.children.stepName[0].image;
        }
        
        stepCode += ': ';
        
        // Get condition (simplified)
        if (stepNode.children.stepCondition) {
            stepCode += this.expressionToCode(stepNode.children.stepCondition[0]);
        } else {
            stepCode += 'true';
        }
        
        stepCode += ' => ';
        
        // Get statements (simplified)
        if (stepNode.children.statementList) {
            stepCode += 'x = 1'; // Simplified
        }
        
        return stepCode;
    }

    summarizeClauseToCode(summarizeNode) {
        // For now, return a simplified summarize
        return 'summarize { ... }';
    }

    insertIntoClauseToCode(insertIntoNode) {
        const targetStream = insertIntoNode.children.targetStream[0].image;
        return `insert_into(${targetStream})`;
    }

    writeToFileClauseToCode(writeToFileNode) {
        const filePath = this.expressionToCode(writeToFileNode.children.filePath[0]);
        return `write_to_file(${filePath})`;
    }

    assertOrSaveExpectedClauseToCode(assertNode) {
        const filePath = this.expressionToCode(assertNode.children.filePath[0]);
        return `assert_or_save_expected(${filePath})`;
    }

    selectObjectToCode(selectObjectNode) {
        // Simplified - just return basic object syntax
        return '{ ... }';
    }

    expressionToCode(expressionNode) {
        if (!expressionNode || !expressionNode.children) {
            return '';
        }

        // Handle different expression types
        if (expressionNode.children.primaryExpression) {
            return this.primaryExpressionToCode(expressionNode.children.primaryExpression[0]);
        }

        return 'expr';
    }

    primaryExpressionToCode(primaryNode) {
        if (!primaryNode || !primaryNode.children) {
            return '';
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
            return primaryNode.children.nullLiteral[0].image;
        }
        if (primaryNode.children.identifier) {
            return primaryNode.children.identifier[0].image;
        }

        return '';
    }

    /**
     * Get statement type for display purposes
     */
    getStatementType(stmt) {
        if (stmt.type === 'createStatement') {
            return stmt.ast.command === 'create_stream' ? 'create_stream' : 'create_flow';
        }
        return stmt.type;
    }

    /**
     * Extract statement text from original input (simplified)
     */
    extractStatementText(input, stmt, index) {
        // For now, just return a simplified version
        if (stmt.type === 'createStatement') {
            if (stmt.ast.command === 'create_stream') {
                return `create stream ${stmt.ast.streamName}`;
            } else {
                return `create flow ${stmt.ast.flowName}`;
            }
        }
        // For other types, return a placeholder
        return `${stmt.type} statement`;
    }

}

export default BatchQueryEngine;