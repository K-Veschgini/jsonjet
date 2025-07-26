/**
 * Base class for all scalar functions in JSDB
 * Simple interface for function execution with error handling
 */

import { JSONJetError, ErrorCodes } from '../../core/jsdb-error.js';

export class ScalarFunction {
    /**
     * @param {string} name - Function name
     */
    constructor(name) {
        this.name = name;
    }
    
    /**
     * Execute the function with given arguments
     * @param {Array} args - Function arguments
     * @returns {any} Function result
     */
    execute(args) {
        try {
            return this._execute(args);
        } catch (error) {
            if (error instanceof JSONJetError) {
                throw error;
            }
            throw new JSONJetError(
                ErrorCodes.FUNCTION_EXECUTION_ERROR,
                `Error executing function '${this.name}': ${error.message}`
            );
        }
    }
    
    /**
     * Internal execution method - must be implemented by subclasses
     * @param {Array} args - Function arguments
     * @returns {any} Function result
     * @protected
     */
    _execute(args) {
        throw new JSONJetError(
            ErrorCodes.FUNCTION_DEFINITION_ERROR,
            `Function '${this.name}' must implement _execute method`
        );
    }
    
}