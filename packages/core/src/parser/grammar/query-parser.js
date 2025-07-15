import { CstParser } from 'chevrotain';
import { allTokens } from '../tokens/token-registry.js';
import { createQueryLexer } from '../lexer/lexer-factory.js';

// Import rule definition functions
import { defineCoreCrules } from '../rules/core-rules.js';
import { defineExpressionRules } from '../rules/expression-rules.js';
import { defineQueryOperationRules } from '../rules/query-operation-rules.js';
import { defineCommandRules } from '../rules/command-rules.js';
import { defineLiteralRules } from '../rules/literal-rules.js';

// =============================================================================
// QUERY PARSER CLASS
// =============================================================================
export class QueryParser extends CstParser {
    constructor() {
        super(allTokens);
        
        // Define all grammar rules by calling rule definition functions
        // This approach keeps the class clean and rules organized by category
        defineCoreCrules.call(this);
        defineExpressionRules.call(this);
        defineQueryOperationRules.call(this);
        defineCommandRules.call(this);
        defineLiteralRules.call(this);
        
        // Perform self-analysis after all rules are defined
        this.performSelfAnalysis();
    }
}

// =============================================================================
// MAIN PARSE FUNCTION
// =============================================================================
export function parseQuery(queryText) {
    // Tokenize the input using context-sensitive lexer
    const contextSensitiveLexer = createQueryLexer();
    const lexingResult = contextSensitiveLexer.tokenize(queryText);
    
    if (lexingResult.errors.length > 0) {
        throw new Error(`Lexing errors: ${lexingResult.errors.map(e => e.message).join(', ')}`);
    }

    // Create fresh parser instance to ensure robust syntax changes
    const parserInstance = new QueryParser();
    parserInstance.input = lexingResult.tokens;
    
    // Parse starting from the main 'query' rule
    const cst = parserInstance.query();

    if (parserInstance.errors.length > 0) {
        throw new Error(`Parsing errors: ${parserInstance.errors.map(e => e.message).join(', ')}`);
    }

    return {
        cst,
        tokens: lexingResult.tokens,
        lexErrors: lexingResult.errors,
        parseErrors: parserInstance.errors
    };
}

// =============================================================================
// EXPORTS
// =============================================================================
export { allTokens };