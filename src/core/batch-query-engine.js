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
            console.warn('Unified parsing failed, falling back to legacy:', error.message);
            // Fallback to legacy parsing logic for backward compatibility
            return this.parseLegacy(input);
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
                if (stmt.type === 'legacy') {
                    // Legacy statement - execute directly
                    result = await this.queryEngine.executeStatement(stmt.text);
                } else if (stmt.isCommand) {
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
            // For regular pipeline queries, fall back to legacy for now
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
        
        // Build legacy flow command for now
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
        // Simple conversion - this could be improved
        if (pipelineAst && pipelineAst.source) {
            let code = pipelineAst.source.sourceName;
            if (pipelineAst.operations) {
                for (const op of pipelineAst.operations) {
                    code += ' | ' + this.operationToCode(op);
                }
            }
            return code;
        }
        return '';
    }

    operationToCode(operation) {
        // Basic operation conversion - this is simplified
        if (operation.includes('where')) return operation;
        if (operation.includes('select')) return operation;
        return operation;
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

    /**
     * Legacy parsing fallback - handles multi-line statements like the original RDB test runner
     */
    parseLegacy(input) {
        const lines = input.split('\n');
        const statements = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines and comments
            if (!line || line.startsWith('//')) {
                continue;
            }
            
            // Check if this looks like a statement
            if (/^(create|insert|delete|flush|list|info|subscribe|unsubscribe|[a-zA-Z_][a-zA-Z0-9_]*\s*\|)/.test(line)) {
                let currentStatement = line;
                let currentLine = i;
                
                // Handle multi-line statements
                if (!line.endsWith(';')) {
                    for (let j = i + 1; j < lines.length; j++) {
                        const nextLine = lines[j].trim();
                        
                        if (!nextLine || nextLine.startsWith('//')) {
                            break;
                        }
                        
                        currentStatement += ' ' + nextLine;
                        
                        if (nextLine.endsWith(';') || this.isCompleteStatement(currentStatement)) {
                            i = j;
                            break;
                        }
                    }
                }
                
                if (this.isCompleteStatement(currentStatement)) {
                    const trimmed = currentStatement.replace(/;$/, '').trim();
                    statements.push({
                        index: statements.length,
                        text: trimmed,
                        type: 'legacy',
                        isCommand: true,
                        isQuery: false,
                        ast: null
                    });
                }
            }
        }
        
        return statements;
    }

    /**
     * Check if a statement is complete (from original RDB test runner)
     */
    isCompleteStatement(stmt) {
        const trimmed = stmt.trim();
        if (!trimmed) return false;
        
        let braceCount = 0;
        let bracketCount = 0; 
        let parenCount = 0;
        let inDoubleQuote = false;
        let inSingleQuote = false;
        let escapeNext = false;
        
        for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];
            
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            
            if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
                continue;
            }
            
            if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
                continue;
            }
            
            if (inDoubleQuote || inSingleQuote) continue;
            
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (char === '[') bracketCount++;
            if (char === ']') bracketCount--;
            if (char === '(') parenCount++;
            if (char === ')') parenCount--;
        }
        
        return trimmed.endsWith(';') && 
               braceCount === 0 && 
               bracketCount === 0 && 
               parenCount === 0;
    }
}

export default BatchQueryEngine;