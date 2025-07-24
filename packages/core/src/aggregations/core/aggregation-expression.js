import { Aggregation } from './aggregation.js';
import { safeGet } from '../../utils/safe-access.js';

// Static registry references - set by components that use AggregationExpression
let _functionRegistry = null;
let _aggregationRegistry = null;

/**
 * Set the function registry for AggregationExpression to use
 * @param {Registry} registry - Registry instance containing functions
 */
export function setFunctionRegistry(registry) {
    _functionRegistry = registry;
}

/**
 * Set the aggregation registry for AggregationExpression to use
 * @param {Registry} registry - Registry instance containing aggregations
 */
export function setAggregationRegistry(registry) {
    _aggregationRegistry = registry;
}

/**
 * Get the current function registry
 * @returns {Registry} Current function registry
 */
function getFunctionRegistry() {
    if (!_functionRegistry) {
        throw new Error('Function registry not set. Call setFunctionRegistry() before using AggregationExpression.');
    }
    return _functionRegistry;
}

/**
 * Get the current aggregation registry
 * @returns {Registry} Current aggregation registry
 */
function getAggregationRegistry() {
    if (!_aggregationRegistry) {
        throw new Error('Aggregation registry not set. Call setAggregationRegistry() before using AggregationExpression.');
    }
    return _aggregationRegistry;
}

/**
 * AggregationExpression - Tree-based aggregation expression builder
 * 
 * Represents a tree where each node has a function name and args.
 * Action is inferred from function name:
 * - 'safeGet' -> safeGet action
 * - aggregation function name -> aggregation action  
 * - scalar function name -> scalar action
 */
export class AggregationExpression extends Aggregation {
    constructor(functionName, args = []) {
        super();
        this.functionName = functionName;
        this.args = args; // Array of AggregationExpression or literals
        this.result = null;
        this.wrappedAggregation = null; // For aggregation actions
        
        // Infer action from function name
        this.action = this._inferAction(functionName);
        
        // If this is an aggregation action, create the wrapped aggregation
        if (this.action === 'aggregation') {
            this.wrappedAggregation = this._createWrappedAggregation();
        }
    }
    
    /**
     * Infer action type from function name
     */
    _inferAction(functionName) {
        if (functionName === 'safeGet') {
            return 'safeGet';
        } else if (getAggregationRegistry().hasAggregation(functionName)) {
            return 'aggregation';
        } else if (getFunctionRegistry().hasFunction(functionName)) {
            return 'scalar';
        } else {
            throw new Error(`Unknown function: ${functionName}`);
        }
    }
    
    /**
     * Create wrapped aggregation based on function name
     */
    _createWrappedAggregation() {
        // For aggregation functions, create with no args - the args are used for evaluation during push
        return getAggregationRegistry().createAggregation(this.functionName);
    }
    
    /**
     * Push data through the expression tree
     */
    push(object, context = {}) {
        if (this.action === 'aggregation') {
            // For aggregation, evaluate args with current object and context, then push result
            const values = this._evaluateArgsForPush(object, context);
            if (this.wrappedAggregation) {
                this.wrappedAggregation.push(...values);
            }
        } else if (this.action === 'safeGet') {
            // For safeGet, extract value and store as result
            if (this.args.length === 0) {
                throw new Error('safeGet requires field name');
            }
            const fieldName = this.args[0];
            this.result = safeGet(object, fieldName);
        } else if (this.action === 'scalar') {
            // For scalar, evaluate with current object and context, then store result
            this.result = this._evaluateScalarWithObject(object, context);
            // Also push to child aggregations
            this._pushToChildren(object, context);
        } else {
            // For non-aggregation actions, push to all child aggregations
            this._pushToChildren(object, context);
        }
    }
    
    /**
     * Push object to all child AggregationExpression nodes
     */
    _pushToChildren(object, context = {}) {
        for (const arg of this.args) {
            if (arg instanceof AggregationExpression) {
                arg.push(object, context);
            }
        }
    }
    
    /**
     * Get the result of this expression
     */
    getResult() {
        switch (this.action) {
            case 'scalar':
                // scalar evaluates during push() and stores result
                return this.result;
            case 'aggregation':
                return this.wrappedAggregation ? this.wrappedAggregation.getResult() : null;
            case 'safeGet':
                // safeGet extracts value during push() and stores it as result
                return this.result;
            default:
                throw new Error(`Unknown action: ${this.action}`);
        }
    }
    
    /**
     * Evaluate scalar function with current arg results
     */
    _evaluateScalar() {
        // Get results from all args
        const argValues = this.args.map(arg => {
            if (arg instanceof AggregationExpression) {
                return arg.getResult();
            } else {
                return arg; // literal value
            }
        });
        
        return getFunctionRegistry().executeFunction(this.functionName, argValues);
    }
    
    /**
     * Evaluate args with current object and context (for push operations)
     */
    _evaluateArgsForPush(object, context = {}) {
        // For aggregation, if no args, use the whole object
        if (this.args.length === 0) {
            return [object];
        }
        
        // Evaluate all args - some aggregations might need multiple values per push
        return this.args.map(arg => this._evaluateArgWithObject(arg, object, context));
    }
    
    /**
     * Evaluate a single arg with current object and context
     */
    _evaluateArgWithObject(arg, object, context = {}) {
        if (arg instanceof AggregationExpression) {
            switch (arg.action) {
                case 'safeGet':
                    if (arg.args.length === 0) {
                        throw new Error('safeGet requires field name');
                    }
                    const fieldName = arg.args[0];
                    return safeGet(object, fieldName);
                case 'scalar':
                    // Evaluate scalar with object and context
                    return arg._evaluateScalarWithObject(object, context);
                case 'aggregation':
                    // For aggregation in object context, return current result
                    // This allows scalar functions to access intermediate aggregation results
                    return arg.getResult();
                default:
                    throw new Error(`Cannot evaluate ${arg.action} in object context`);
            }
        } else {
            return arg; // literal value
        }
    }
    
    /**
     * Evaluate scalar function with object and context
     */
    _evaluateScalarWithObject(object, context = {}) {
        // Get values from all args with object and context
        const argValues = this.args.map(arg => this._evaluateArgWithObject(arg, object, context));
        
        return getFunctionRegistry().executeFunction(this.functionName, argValues);
    }
    
    /**
     * Reset this expression and all children
     */
    reset() {
        this.result = null;
        
        if (this.wrappedAggregation) {
            this.wrappedAggregation.reset();
        }
        
        // Reset all child expressions
        for (const arg of this.args) {
            if (arg instanceof AggregationExpression) {
                arg.reset();
            }
        }
    }
    
    /**
     * Clone this expression and all children
     */
    clone() {
        const clonedArgs = this.args.map(arg => {
            if (arg instanceof AggregationExpression) {
                return arg.clone();
            } else {
                return arg; // literals are immutable
            }
        });
        
        return new AggregationExpression(this.functionName, clonedArgs);
    }
}