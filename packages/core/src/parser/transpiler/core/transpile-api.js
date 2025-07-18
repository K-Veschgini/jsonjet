import { parseQuery } from '../../grammar/query-parser.js';
import { QueryTranspiler } from './query-transpiler.js';
import { ParseError, TranspilerError } from '../errors/transpiler-errors.js';
import { Stream } from '../../../core/stream.js';
import * as Operators from '../../../operators/index.js';
import { safeGet } from '../../../utils/safe-access.js';
import { Registry } from '../../../core/registry.js';
import { registerServerFunctions } from '../../../functions/server-index.js';
import { registerServerAggregations } from '../../../aggregations/server-index.js';
import { AggregationObject } from '../../../aggregations/core/aggregation-object.js';
import { AggregationExpression, setFunctionRegistry, setAggregationRegistry } from '../../../aggregations/core/aggregation-expression.js';

// =============================================================================
// TRANSPILATION API
// =============================================================================
// Clean, well-structured API for query transpilation

/**
 * Main transpilation function - converts JSDB query to JavaScript
 * @param {string} queryText - JSDB query string
 * @returns {Object} Transpilation result with JavaScript code and metadata
 */
export function transpileQuery(queryText) {
    try {
        // Step 1: Parse the query
        const parseResult = parseQuery(queryText);
        
        if (parseResult.parseErrors.length > 0) {
            throw new ParseError(
                `Parse errors: ${parseResult.parseErrors.map(e => e.message).join(', ')}`,
                parseResult.parseErrors
            );
        }
        
        // Step 2: Create fresh transpiler instance for robust syntax changes
        const transpilerInstance = new QueryTranspiler();
        
        // Step 3: Transpile the CST to JavaScript
        const jsCode = transpilerInstance.visit(parseResult.cst);
        
        // Step 4: Generate imports and metadata
        const imports = generateImports();
        
        return {
            javascript: jsCode,
            imports: imports,
            cst: parseResult.cst,
            tokens: parseResult.tokens,
            metadata: {
                queryText,
                timestamp: new Date().toISOString(),
                version: '2.0.0' // New modular transpiler version
            }
        };
        
    } catch (error) {
        if (error instanceof TranspilerError) {
            throw error;
        }
        throw new TranspilerError(`Transpilation failed: ${error.message}`, {
            originalError: error.message,
            queryText
        });
    }
}

/**
 * Create executable JavaScript function from JSDB query
 * @param {string} queryText - JSDB query string
 * @returns {Object} Executable query function with metadata
 */
export function createQueryFunction(queryText) {
    const result = transpileQuery(queryText);
    
    return {
        execute: async function(data) {
            // Create unified registry for this execution
            const functionRegistry = new Registry();
            registerServerFunctions(functionRegistry);
            registerServerAggregations(functionRegistry);
            setFunctionRegistry(functionRegistry);
            setAggregationRegistry(functionRegistry);
            
            // Create execution context with static imports
            const createPipeline = new Function('Stream', 'Operators', 'safeGet', 'functionRegistry', 'AggregationObject', 'AggregationExpression', `
                return new Stream()${result.javascript};
            `);
            
            const stream = createPipeline(Stream, Operators, safeGet, functionRegistry, AggregationObject, AggregationExpression);
            
            // Collect results
            const results = [];
            stream.collect((result) => {
                results.push(result);
            });
            
            // Push data through the stream
            for (const item of data) {
                stream.push(item);
            }
            
            // Wait for all processing to complete
            await stream.finish();
            
            return results;
        },
        javascript: result.javascript,
        originalQuery: queryText,
        metadata: result.metadata
    };
}

/**
 * Validate a query without full transpilation
 * @param {string} queryText - JSDB query string
 * @returns {Object} Validation result
 */
export function validateQuery(queryText) {
    try {
        const parseResult = parseQuery(queryText);
        
        return {
            valid: parseResult.parseErrors.length === 0 && parseResult.lexErrors.length === 0,
            parseErrors: parseResult.parseErrors,
            lexErrors: parseResult.lexErrors,
            tokens: parseResult.tokens.length,
            metadata: {
                queryText,
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            valid: false,
            parseErrors: [{ message: error.message }],
            lexErrors: [],
            tokens: 0,
            metadata: {
                queryText,
                timestamp: new Date().toISOString(),
                error: error.message
            }
        };
    }
}

/**
 * Get detailed transpilation information for debugging
 * @param {string} queryText - JSDB query string
 * @returns {Object} Detailed transpilation info
 */
export function getTranspilationInfo(queryText) {
    try {
        const parseResult = parseQuery(queryText);
        const transpilerInstance = new QueryTranspiler();
        const jsCode = transpilerInstance.visit(parseResult.cst);
        
        return {
            success: true,
            input: {
                queryText,
                tokenCount: parseResult.tokens.length,
                tokens: parseResult.tokens.map(t => ({ type: t.tokenType.name, value: t.image }))
            },
            output: {
                javascript: jsCode,
                imports: generateImports(),
                estimatedComplexity: estimateComplexity(parseResult.cst)
            },
            parsing: {
                parseErrors: parseResult.parseErrors,
                lexErrors: parseResult.lexErrors,
                cstNodeCount: countCstNodes(parseResult.cst)
            },
            metadata: {
                timestamp: new Date().toISOString(),
                transpilerVersion: '2.0.0'
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            metadata: {
                timestamp: new Date().toISOString(),
                queryText
            }
        };
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateImports() {
    return `import { Stream } from './src/core/stream.js';
import * as Operators from './src/operators/index.js';
import { safeGet } from './src/utils/safe-access.js';
import { functionRegistry } from './src/functions/index.js';
import { AggregationObject } from './src/aggregations/core/aggregation-object.js';
import { AggregationExpression } from './src/aggregations/core/aggregation-expression.js';`;
}

function estimateComplexity(cst) {
    // Simple complexity estimation based on CST structure
    const nodeCount = countCstNodes(cst);
    if (nodeCount < 10) return 'low';
    if (nodeCount < 25) return 'medium';
    return 'high';
}

function countCstNodes(node) {
    if (!node || typeof node !== 'object') return 0;
    
    let count = 1;
    Object.values(node).forEach(value => {
        if (Array.isArray(value)) {
            count += value.reduce((sum, item) => sum + countCstNodes(item), 0);
        } else if (value && typeof value === 'object') {
            count += countCstNodes(value);
        }
    });
    
    return count;
}