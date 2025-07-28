import { queryParser } from '../../grammar/query-parser.js';
import { UnifiedCommandVisitorMixin } from '../visitors/unified-command-visitor.js';
import { QueryOperationVisitorMixin } from '../visitors/query-operation-visitor.js';
import { ExpressionVisitorMixin } from '../visitors/expression-visitor.js';
import { LiteralVisitorMixin } from '../visitors/literal-visitor.js';

/**
 * Unified Transpiler - Handles both commands and queries in the new grammar
 */
export class Transpiler {
    constructor() {
        // Get the base visitor constructor from unified parser
        const BaseCstVisitor = queryParser.getBaseCstVisitorConstructor();
        
        // Create the visitor instance
        this._visitor = new (class extends BaseCstVisitor {
            constructor() {
                super();
            }
        })();

        // Apply all visitor mixins to the instance
        this._applyMixins();
    }

    _applyMixins() {
        // Apply visitor mixins
        Object.assign(this._visitor, UnifiedCommandVisitorMixin);
        Object.assign(this._visitor, QueryOperationVisitorMixin);
        Object.assign(this._visitor, ExpressionVisitorMixin);
        Object.assign(this._visitor, LiteralVisitorMixin);
    }

    visit(cst) {
        return this._visitor.visit(cst);
    }

    /**
     * Transpile a program (multiple statements) to execution plan
     */
    transpileProgram(cst) {
        const statements = this.visit(cst);
        const executionPlan = {
            type: 'program',
            statements: [],
            commands: [],
            queries: []
        };

        for (const stmt of statements) {
            if (!stmt) continue;

            executionPlan.statements.push(stmt);

            // Categorize for execution
            if (this.isCommand(stmt)) {
                executionPlan.commands.push(stmt);
            } else if (this.isQuery(stmt)) {
                executionPlan.queries.push(stmt);
            }
        }

        return executionPlan;
    }

    /**
     * Transpile a single statement (backward compatibility)
     */
    transpileStatement(cst) {
        const stmt = this.visit(cst);
        return {
            type: 'statement',
            statement: stmt,
            isCommand: this.isCommand(stmt),
            isQuery: this.isQuery(stmt)
        };
    }

    /**
     * Check if a statement is a command
     */
    isCommand(stmt) {
        if (!stmt || !stmt.type) return false;
        
        const commandTypes = [
            'createStatement', 'deleteStatement', 'insertStatement', 'flushStatement', 
            'listStatement', 'infoStatement', 'subscribeStatement', 'unsubscribeStatement'
        ];

        return commandTypes.includes(stmt.type);
    }

    /**
     * Check if a statement is a query
     */
    isQuery(stmt) {
        if (!stmt || !stmt.type) return false;
        
        // Pipeline queries are queries
        if (stmt.type === 'pipelineQuery' || stmt.ast?.type === 'pipeline') {
            return true;
        }

        // Create flow statements are also queries
        if (stmt.type === 'createStatement' && stmt.ast?.command === 'create_flow') {
            return true;
        }

        return false;
    }

    /**
     * Convert command AST to executable command object
     */
    commandToExecutable(stmt) {
        if (!this.isCommand(stmt)) {
            throw new Error('Statement is not a command');
        }

        const ast = stmt.ast;
        return {
            type: 'command',
            command: ast.command,
            params: this.extractCommandParams(ast)
        };
    }

    /**
     * Convert query AST to executable query code
     */
    queryToExecutable(stmt) {
        if (!this.isQuery(stmt)) {
            throw new Error('Statement is not a query');
        }

        // For create flow statements, handle specially
        if (stmt.type === 'createStatement' && stmt.ast?.command === 'create_flow') {
            const ast = stmt.ast;
            const queryCode = this.pipelineToCode(ast.flowQuery);
            
            return {
                type: 'create_flow',
                flowName: ast.flowName,
                modifier: ast.modifier,
                ttlExpression: ast.ttlExpression,
                queryCode
            };
        }

        // Regular pipeline query
        const ast = stmt.ast;
        return {
            type: 'query',
            code: this.pipelineToCode(ast)
        };
    }

    /**
     * Convert pipeline AST to executable JavaScript code
     */
    pipelineToCode(pipelineAst) {
        const sourceName = pipelineAst.source.sourceName;
        let code = `streamManager.getStreamReadable('${sourceName}')`;

        for (const operation of pipelineAst.operations) {
            code += operation; // operations are already transpiled to pipe() calls
        }

        return code;
    }

    /**
     * Extract parameters from command AST
     */
    extractCommandParams(ast) {
        const params = {};
        
        // Copy all properties except 'command'
        for (const [key, value] of Object.entries(ast)) {
            if (key !== 'command') {
                params[key] = value;
            }
        }

        return params;
    }
}

// Export singleton instance
export const transpiler = new Transpiler();