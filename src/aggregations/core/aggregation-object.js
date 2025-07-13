import { Aggregation } from './aggregation.js';
import { AggregationExpression } from './aggregation-expression.js';

/**
 * Aggregation object that can hold AggregationExpressions at any depth
 * Used in summarize operations like: 
 * | summarize { 
 *     metrics: { total: sum(value), count: count() },
 *     status: 'active',
 *     nested: { deep: { avg: div(sum(value), count()) } }
 *   }
 */
export class AggregationObject extends Aggregation {
    constructor(spec) {
        super();
        this.spec = spec; // Object structure with AggregationExpressions at leaves
        this.aggregations = []; // Flat array of all AggregationExpressions found
        this.processedSpec = null; // Spec with AggregationExpressions replaced by placeholders
        
        // Change tracking state
        this._lastResult = null;
        this._hasChanged = true; // Initially true since we haven't computed a result yet
        
        this._findAggregations();
    }
    
    /**
     * Recursively find all AggregationExpressions in the spec and replace with placeholders
     */
    _findAggregations() {
        this.processedSpec = this._processRecursively(this.spec, []);
    }
    
    _processRecursively(obj, path) {
        if (obj instanceof AggregationExpression) {
            // Found an aggregation - store it and return placeholder
            const index = this.aggregations.length;
            this.aggregations.push({
                path: [...path],
                expression: obj,
                placeholder: `__AGG_${index}__`
            });
            return `__AGG_${index}__`;
        }
        
        if (Array.isArray(obj)) {
            return obj.map((item, i) => 
                this._processRecursively(item, [...path, i])
            );
        }
        
        if (obj && typeof obj === 'object' && obj.constructor === Object) {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this._processRecursively(value, [...path, key]);
            }
            return result;
        }
        
        // Primitive value, return as-is
        return obj;
    }
    
    push(object) {
        // Push the object to all aggregations
        for (const { expression } of this.aggregations) {
            expression.push(object);
        }
        
        // Mark that we have new data, so result may have changed
        this._hasChanged = true;
    }
    
    getResult() {
        // Build result by replacing placeholders with actual aggregation results
        const result = this._buildResultRecursively(this.processedSpec);
        
        // Update change tracking
        this._lastResult = this._deepClone(result);
        
        return result;
    }
    
    _buildResultRecursively(obj) {
        if (typeof obj === 'string' && obj.startsWith('__AGG_') && obj.endsWith('__')) {
            // Replace placeholder with aggregation result
            const aggInfo = this.aggregations.find(agg => agg.placeholder === obj);
            return aggInfo ? aggInfo.expression.getResult() : obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this._buildResultRecursively(item));
        }
        
        if (obj && typeof obj === 'object' && obj.constructor === Object) {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this._buildResultRecursively(value);
            }
            return result;
        }
        
        // Primitive value, return as-is
        return obj;
    }
    
    reset() {
        // Reset all aggregations
        for (const { expression } of this.aggregations) {
            expression.reset();
        }
        
        // Reset change tracking
        this._lastResult = null;
        this._hasChanged = true;
    }
    
    clone() {
        // Clone by recursively cloning the spec
        const clonedSpec = this._cloneRecursively(this.spec);
        return new AggregationObject(clonedSpec);
    }
    
    _cloneRecursively(obj) {
        if (obj instanceof AggregationExpression) {
            return obj.clone();
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this._cloneRecursively(item));
        }
        
        if (obj && typeof obj === 'object' && obj.constructor === Object) {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this._cloneRecursively(value);
            }
            return result;
        }
        
        // Primitive value, return as-is
        return obj;
    }
    
    /**
     * Check if the aggregation result has changed since last check
     */
    hasChanged() {
        if (this._hasChanged) {
            return true;
        }
        
        // Check if any child aggregation has changed
        for (const { expression } of this.aggregations) {
            if (expression.hasChanged && expression.hasChanged()) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Mark that change check has been performed
     */
    markChangeChecked() {
        this._hasChanged = false;
        
        // Mark change checked on all child aggregations
        for (const { expression } of this.aggregations) {
            if (expression.markChangeChecked) {
                expression.markChangeChecked();
            }
        }
    }
    
    /**
     * Deep clone a result object for change tracking
     */
    _deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this._deepClone(item));
        }
        
        const cloned = {};
        for (const [key, value] of Object.entries(obj)) {
            cloned[key] = this._deepClone(value);
        }
        return cloned;
    }
}