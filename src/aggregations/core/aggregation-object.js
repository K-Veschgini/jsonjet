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
    }
    
    getResult() {
        // Build result by replacing placeholders with actual aggregation results
        return this._buildResultRecursively(this.processedSpec);
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
}