/**
 * Unified Registry - Combines functions, aggregations, and operators
 * Non-singleton, each manager gets its own instance
 */

import { JSONJetError, ErrorCodes } from './jsdb-error.js';
import { ScalarFunction } from '../functions/core/scalar-function.js';

export class Registry {
    constructor() {
        // Function registry (scalar functions)
        this.functions = new Map(); // name -> ScalarFunction instance
        
        // Aggregation registry (aggregation classes)
        this.aggregations = new Map(); // name -> AggregationClass
        
        // Operator registry (operator classes)
        this.operators = new Map(); // name -> OperatorClass
        
        // Lookup registry (constants/variables)
        this.lookups = new Map(); // name -> value
    }
    
    // =============================================================================
    // FUNCTION REGISTRATION AND ACCESS
    // =============================================================================
    
    /**
     * Register a scalar function
     * @param {ScalarFunction} functionInstance - Function instance to register
     */
    registerFunction(functionInstance) {
        if (!(functionInstance instanceof ScalarFunction)) {
            throw new JSONJetError(
                ErrorCodes.FUNCTION_DEFINITION_ERROR,
                'Can only register instances of ScalarFunction'
            );
        }
        
        const name = functionInstance.name.toLowerCase();
        
        if (this.functions.has(name)) {
            throw new JSONJetError(
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
    getFunction(name) {
        return this.functions.get(name.toLowerCase()) || null;
    }
    
    /**
     * Check if a function exists
     * @param {string} name - Function name
     * @returns {boolean} True if function exists
     */
    hasFunction(name) {
        return this.functions.has(name.toLowerCase());
    }
    
    /**
     * Execute a function with given arguments
     * @param {string} name - Function name
     * @param {Array} args - Function arguments
     * @returns {any} Function result
     */
    executeFunction(name, args) {
        const func = this.getFunction(name);
        if (!func) {
            throw new JSONJetError(
                ErrorCodes.FUNCTION_NOT_FOUND,
                `Function '${name}' is not registered`
            );
        }
        
        return func.execute(args);
    }
    
    /**
     * Get all registered function names
     * @returns {string[]}
     */
    getFunctionNames() {
        return Array.from(this.functions.keys());
    }
    
    // =============================================================================
    // AGGREGATION REGISTRATION AND ACCESS
    // =============================================================================
    
    /**
     * Register an aggregation class
     * @param {string} name - Aggregation name
     * @param {class} AggregationClass - Aggregation class constructor
     */
    registerAggregation(name, AggregationClass) {
        this.aggregations.set(name.toLowerCase(), AggregationClass);
    }
    
    /**
     * Create a new aggregation instance
     * @param {string} name - Aggregation name
     * @param {...any} args - Constructor arguments
     * @returns {Aggregation} New aggregation instance
     */
    createAggregation(name, ...args) {
        const AggregationClass = this.aggregations.get(name.toLowerCase());
        if (!AggregationClass) {
            throw new Error(`Unknown aggregation function: ${name}`);
        }
        return new AggregationClass(...args);
    }
    
    /**
     * Check if aggregation exists
     * @param {string} name - Aggregation name
     * @returns {boolean}
     */
    hasAggregation(name) {
        return this.aggregations.has(name.toLowerCase());
    }
    
    /**
     * Get aggregation class
     * @param {string} name - Aggregation name
     * @returns {class|null} Aggregation class or null if not found
     */
    getAggregation(name) {
        return this.aggregations.get(name.toLowerCase()) || null;
    }
    
    /**
     * Get all registered aggregation names
     * @returns {string[]}
     */
    getAggregationNames() {
        return Array.from(this.aggregations.keys());
    }
    
    // =============================================================================
    // OPERATOR REGISTRATION AND ACCESS
    // =============================================================================
    
    /**
     * Register an operator class
     * @param {string} name - Operator name
     * @param {class} OperatorClass - Operator class constructor
     */
    registerOperator(name, OperatorClass) {
        this.operators.set(name.toLowerCase(), OperatorClass);
    }
    
    /**
     * Create a new operator instance
     * @param {string} name - Operator name
     * @param {...any} args - Constructor arguments
     * @returns {Operator} New operator instance
     */
    createOperator(name, ...args) {
        const OperatorClass = this.operators.get(name.toLowerCase());
        if (!OperatorClass) {
            throw new Error(`Unknown operator: ${name}`);
        }
        return new OperatorClass(...args);
    }
    
    /**
     * Check if operator exists
     * @param {string} name - Operator name
     * @returns {boolean}
     */
    hasOperator(name) {
        return this.operators.has(name.toLowerCase());
    }
    
    /**
     * Get operator class
     * @param {string} name - Operator name
     * @returns {class|null} Operator class or null if not found
     */
    getOperator(name) {
        return this.operators.get(name.toLowerCase()) || null;
    }
    
    /**
     * Get all registered operator names
     * @returns {string[]}
     */
    getOperatorNames() {
        return Array.from(this.operators.keys());
    }
    
    // =============================================================================
    // LOOKUP REGISTRATION AND ACCESS
    // =============================================================================
    
    /**
     * Register a lookup value
     * @param {string} name - Lookup name
     * @param {any} value - Lookup value (must be serializable)
     */
    registerLookup(name, value) {
        const normalizedName = name.toLowerCase();
        
        // Validate lookup name format
        if (!this._isValidLookupName(name)) {
            throw new JSONJetError(
                ErrorCodes.LOOKUP_DEFINITION_ERROR,
                `Invalid lookup name '${name}'. Names must be valid identifiers.`
            );
        }
        
        // Check for conflicts with existing functions, aggregations, or operators
        if (this.hasFunction(normalizedName) || this.hasAggregation(normalizedName) || this.hasOperator(normalizedName)) {
            throw new JSONJetError(
                ErrorCodes.LOOKUP_NAME_CONFLICT,
                `Cannot create lookup '${name}': conflicts with existing function, aggregation, or operator`
            );
        }
        
        // Validate lookup value
        if (!this._isValidLookupValue(value)) {
            throw new JSONJetError(
                ErrorCodes.LOOKUP_VALUE_ERROR,
                `Invalid lookup value. Supported types: boolean, number, string, null, array, object`
            );
        }
        
        this.lookups.set(normalizedName, value);
    }
    
    /**
     * Update an existing lookup value (for "or replace" functionality)
     * @param {string} name - Lookup name
     * @param {any} value - New lookup value
     */
    updateLookup(name, value) {
        const normalizedName = name.toLowerCase();
        
        if (!this.hasLookup(normalizedName)) {
            throw new JSONJetError(
                ErrorCodes.LOOKUP_NOT_FOUND,
                `Lookup '${name}' does not exist`
            );
        }
        
        // Validate lookup value
        if (!this._isValidLookupValue(value)) {
            throw new JSONJetError(
                ErrorCodes.LOOKUP_VALUE_ERROR,
                `Invalid lookup value. Supported types: boolean, number, string, null, array, object`
            );
        }
        
        this.lookups.set(normalizedName, value);
    }
    
    /**
     * Get a lookup value by name
     * @param {string} name - Lookup name
     * @returns {any|null} Lookup value or null if not found
     */
    getLookup(name) {
        const result = this.lookups.get(name.toLowerCase());
        return result !== undefined ? result : null;
    }
    
    /**
     * Check if a lookup exists
     * @param {string} name - Lookup name
     * @returns {boolean} True if lookup exists
     */
    hasLookup(name) {
        return this.lookups.has(name.toLowerCase());
    }
    
    /**
     * Delete a lookup
     * @param {string} name - Lookup name
     * @returns {boolean} True if lookup was deleted, false if it didn't exist
     */
    deleteLookup(name) {
        return this.lookups.delete(name.toLowerCase());
    }
    
    /**
     * Get all registered lookup names
     * @returns {string[]}
     */
    getLookupNames() {
        return Array.from(this.lookups.keys());
    }
    
    /**
     * Get all lookups as an object
     * @returns {Object} Object with lookup names as keys and values as values
     */
    getAllLookups() {
        const result = {};
        for (const [name, value] of this.lookups) {
            result[name] = value;
        }
        return result;
    }
    
    // =============================================================================
    // LOOKUP VALIDATION HELPERS
    // =============================================================================
    
    /**
     * Check if a lookup name is valid
     * @param {string} name - Name to validate
     * @returns {boolean} True if valid
     * @private
     */
    _isValidLookupName(name) {
        // Must be a valid JavaScript identifier
        return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
    }
    
    /**
     * Check if a lookup value is valid
     * @param {any} value - Value to validate
     * @returns {boolean} True if valid
     * @private
     */
    _isValidLookupValue(value) {
        // Allow: boolean, number, string, null, array, object
        if (value === null || value === undefined) return true;
        
        const type = typeof value;
        if (type === 'boolean' || type === 'number' || type === 'string') return true;
        
        if (Array.isArray(value)) {
            // All array elements must be valid lookup values
            return value.every(item => this._isValidLookupValue(item));
        }
        
        if (type === 'object') {
            // All object values must be valid lookup values
            return Object.values(value).every(item => this._isValidLookupValue(item));
        }
        
        // Functions, symbols, etc. are not allowed
        return false;
    }
    
    // =============================================================================
    // LEGACY COMPATIBILITY METHODS
    // =============================================================================
    
    /**
     * Legacy method for backward compatibility with functionRegistry.get()
     */
    get(name) {
        return this.getFunction(name);
    }
    
    /**
     * Legacy method for backward compatibility with functionRegistry.has()
     */
    has(name) {
        return this.hasFunction(name);
    }
    
    /**
     * Legacy method for backward compatibility with functionRegistry.execute()
     */
    execute(name, args) {
        return this.executeFunction(name, args);
    }
}