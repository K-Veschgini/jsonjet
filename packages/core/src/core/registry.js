/**
 * Unified Registry - Combines functions, aggregations, and operators
 * Non-singleton, each manager gets its own instance
 */

import { JSDBError, ErrorCodes } from './jsdb-error.js';
import { ScalarFunction } from '../functions/core/scalar-function.js';

export class Registry {
    constructor() {
        // Function registry (scalar functions)
        this.functions = new Map(); // name -> ScalarFunction instance
        
        // Aggregation registry (aggregation classes)
        this.aggregations = new Map(); // name -> AggregationClass
        
        // Operator registry (operator classes)
        this.operators = new Map(); // name -> OperatorClass
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
            throw new JSDBError(
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