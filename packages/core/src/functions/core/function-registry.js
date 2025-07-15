/**
 * Function Registry - Central registry for all scalar functions in JSDB
 */

import { JSDBError, ErrorCodes } from '../../core/jsdb-error.js';
import { ScalarFunction } from './scalar-function.js';

export class FunctionRegistry {
    constructor() {
        this.functions = new Map(); // name -> ScalarFunction instance
    }
    
    /**
     * Register a scalar function
     * @param {ScalarFunction} functionInstance - Function instance to register
     */
    register(functionInstance) {
        if (!(functionInstance instanceof ScalarFunction)) {
            throw new JSDBError(
                ErrorCodes.FUNCTION_DEFINITION_ERROR,
                'Can only register instances of ScalarFunction'
            );
        }
        
        const name = functionInstance.name.toLowerCase();
        
        if (this.functions.has(name)) {
            throw new JSDBError(
                ErrorCodes.FUNCTION_DEFINITION_ERROR,
                `Function '${name}' is already registered`
            );
        }
        
        this.functions.set(name, functionInstance);
    }
    
    /**
     * Get a function by name
     * @param {string} name - Function name
     * @returns {ScalarFunction|null} Function instance or null if not found
     */
    get(name) {
        return this.functions.get(name.toLowerCase()) || null;
    }
    
    /**
     * Check if a function exists
     * @param {string} name - Function name
     * @returns {boolean} True if function exists
     */
    has(name) {
        return this.functions.has(name.toLowerCase());
    }
    
    /**
     * Execute a function with given arguments
     * @param {string} name - Function name
     * @param {Array} args - Function arguments
     * @returns {any} Function result
     */
    execute(name, args) {
        const func = this.get(name);
        if (!func) {
            throw new JSDBError(
                ErrorCodes.FUNCTION_NOT_FOUND,
                `Function '${name}' is not registered`
            );
        }
        
        return func.execute(args);
    }
}

// Global registry instance
export const functionRegistry = new FunctionRegistry();