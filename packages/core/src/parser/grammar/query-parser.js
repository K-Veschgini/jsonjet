import { CstParser } from 'chevrotain';
import { allTokens } from '../tokens/token-registry.js';

// Import all rule definitions
import { defineCoreCrules } from '../rules/core-rules.js';
import { defineCommandRules } from '../rules/command-rules.js';
import { defineQueryOperationRules } from '../rules/query-operation-rules.js';
import { defineLiteralRules } from '../rules/literal-rules.js';
import { defineExpressionRules } from '../rules/expression-rules.js';

/**
 * Unified Query Parser - Handles all statement types including commands and queries
 * Supports both single statements and multi-statement programs
 */
export class QueryParser extends CstParser {
    constructor() {
        super(allTokens, {
            recoveryEnabled: true,
            maxLookahead: 5,
            traceInitPerf: false,
            nodeLocationTracking: "full"
        });

        // Define all grammar rules by calling rule definition functions
        defineCoreCrules.call(this);
        defineCommandRules.call(this);
        defineQueryOperationRules.call(this);
        defineLiteralRules.call(this);
        defineExpressionRules.call(this);

        // Perform static analysis to improve parser performance
        this.performSelfAnalysis();
    }

    /**
     * Parse a single statement (backward compatibility)
     */
    parseStatement(input) {
        this.input = input;
        const cst = this.query();
        
        if (this.errors.length > 0) {
            throw new Error(`Parsing errors: ${this.errors.map(e => e.message).join(', ')}`);
        }
        
        return cst;
    }

    /**
     * Parse multiple statements as a program
     */
    parseProgram(input) {
        this.input = input;
        const cst = this.program();
        
        if (this.errors.length > 0) {
            throw new Error(`Parsing errors: ${this.errors.map(e => e.message).join(', ')}`);
        }
        
        return cst;
    }

    /**
     * Auto-detect and parse either single statement or program
     */
    parseAuto(input) {
        // Reset state
        this.errors = [];
        
        // Try parsing as program first (handles both single and multi-statement)
        try {
            return {
                type: 'program',
                cst: this.parseProgram(input)
            };
        } catch (error) {
            // If program parsing fails, try single statement for backward compatibility
            this.errors = [];
            try {
                return {
                    type: 'statement',
                    cst: this.parseStatement(input)
                };
            } catch (statementError) {
                throw new Error(`Failed to parse input: ${error.message}`);
            }
        }
    }
}

// Export singleton instance for consistency with existing code
export const queryParser = new QueryParser();