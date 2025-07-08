import { Aggregation } from './aggregation.js';
import { functionRegistry } from '../../functions/core/function-registry.js';
import { safeGet } from '../../utils/safe-access.js';
import { aggregationRegistry } from './aggregation-registry.js';

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
        } else if (aggregationRegistry.has(functionName)) {
            return 'aggregation';
        } else if (functionRegistry.has(functionName)) {
            return 'scalar';
        } else {
            throw new Error(`Unknown function: ${functionName}`);
        }
    }
    
    /**
     * Create wrapped aggregation based on function name
     */
    _createWrappedAggregation() {
        // Spread all args as constructor parameters
        return aggregationRegistry.create(this.functionName, ...this.args);
    }
    
    /**
     * Push data through the expression tree
     */
    push(object) {
        if (this.action === 'aggregation') {
            // For aggregation, evaluate args with current object and push result
            const values = this._evaluateArgsForPush(object);
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
            // For scalar, evaluate with current object and store result
            this.result = this._evaluateScalarWithObject(object);
            // Also push to child aggregations
            this._pushToChildren(object);
        } else {
            // For non-aggregation actions, push to all child aggregations
            this._pushToChildren(object);
        }
    }
    
    /**
     * Push object to all child AggregationExpression nodes
     */
    _pushToChildren(object) {
        for (const arg of this.args) {
            if (arg instanceof AggregationExpression) {
                arg.push(object);
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
        
        return functionRegistry.execute(this.functionName, ...argValues);
    }
    
    /**
     * Evaluate args with current object (for push operations)
     */
    _evaluateArgsForPush(object) {
        // For aggregation, if no args, use the whole object
        if (this.args.length === 0) {
            return [object];
        }
        
        // Evaluate all args - some aggregations might need multiple values per push
        return this.args.map(arg => this._evaluateArgWithObject(arg, object));
    }
    
    /**
     * Evaluate a single arg with current object
     */
    _evaluateArgWithObject(arg, object) {
        if (arg instanceof AggregationExpression) {
            switch (arg.action) {
                case 'safeGet':
                    if (arg.args.length === 0) {
                        throw new Error('safeGet requires field name');
                    }
                    const fieldName = arg.args[0];
                    return safeGet(object, fieldName);
                case 'scalar':
                    // Evaluate scalar with object context
                    return arg._evaluateScalarWithObject(object);
                default:
                    throw new Error(`Cannot evaluate ${arg.action} in object context`);
            }
        } else {
            return arg; // literal value
        }
    }
    
    /**
     * Evaluate scalar function with object context
     */
    _evaluateScalarWithObject(object) {
        // Get values from all args with object context
        const argValues = this.args.map(arg => this._evaluateArgWithObject(arg, object));
        
        return functionRegistry.execute(this.functionName, ...argValues);
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