import { parseQuery } from '../../grammar/query-parser.js';
import { QueryTranspiler } from './query-transpiler.js';
import { ParseError, TranspilerError } from '../errors/transpiler-errors.js';

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
            // Import modules dynamically
            const { Stream } = await import('../../../core/stream.js');
            const Operators = await import('../../../operators/index.js');
            const { safeGet } = await import('../../../utils/safe-access.js');
            
            // Create execution context with imports available
            const createPipeline = new Function('Stream', 'Operators', 'safeGet', `
                return new Stream()${result.javascript};
            `);
            
            const stream = createPipeline(Stream, Operators, safeGet);
            
            // Push data through the stream
            for (const item of data) {
                stream.push(item);
            }
            
            // Wait for all processing to complete
            await stream.finish();
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
    return `import * as Operators from './src/operators/index.js';
import { safeGet } from './src/utils/safe-access.js';`;
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