import { Count } from '../functions/count.js';
import { Sum } from '../functions/sum.js';

/**
 * Registry of available aggregation functions
 */
export const AGGREGATION_FUNCTIONS = {
    count: () => ({
        instance: new Count(),
        valueExpression: null // Count doesn't need value evaluation
    }),
    sum: (valueExpr, options = {}) => ({
        instance: new Sum(options),
        valueExpression: valueExpr // Value expression function to evaluate
    })
};

/**
 * Represents an object template with aggregations at any depth
 * Example: { 
 *   summary: { totalSales: sum('amount'), count: count() },
 *   metrics: [count(), sum('profit')],
 *   status: 'complete'
 * }
 */
export class AggregationObject {
    constructor(objectSpec, context = {}) {
        this.originalSpec = objectSpec; // The original object specification
        this.context = context; // Context variables like window reference
        this.aggregations = []; // Array of { path: string, instance: Aggregation, valueExpression: function }
        this.processedSpec = null; // Processed spec with aggregation placeholders
        
        this.parseObjectSpec();
    }
    
    /**
     * Parse the object specification and set up aggregations recursively
     */
    parseObjectSpec() {
        this.processedSpec = this.parseRecursively(this.originalSpec, '');
    }
    
    /**
     * Recursively parse object/array structures to find aggregation functions
     */
    parseRecursively(obj, currentPath) {
        if (this.isAggregationCall(obj)) {
            // Create aggregation instance and store it with its path
            const { instance, valueExpression } = this.createAggregation(obj);
            const aggregationId = `__AGG_${this.aggregations.length}__`;
            this.aggregations.push({ 
                path: currentPath, 
                id: aggregationId,
                instance: instance,
                valueExpression: valueExpression
            });
            return aggregationId; // Placeholder for later replacement
        }
        
        if (Array.isArray(obj)) {
            return obj.map((item, index) => 
                this.parseRecursively(item, `${currentPath}[${index}]`)
            );
        }
        
        if (obj && typeof obj === 'object' && obj.constructor === Object) {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                const path = currentPath ? `${currentPath}.${key}` : key;
                result[key] = this.parseRecursively(value, path);
            }
            return result;
        }
        
        // Primitive value, return as-is
        return obj;
    }
    
    /**
     * Check if a value represents an aggregation function call
     */
    isAggregationCall(value) {
        return value && 
               typeof value === 'object' && 
               value._aggregationFunction && 
               AGGREGATION_FUNCTIONS[value._aggregationFunction];
    }
    

    
    /**
     * Create an aggregation instance from a function specification
     */
    createAggregation(spec) {
        const funcName = spec._aggregationFunction;
        const args = spec._arguments || [];
        
        if (!AGGREGATION_FUNCTIONS[funcName]) {
            throw new Error(`Unknown aggregation function: ${funcName}`);
        }
        
        return AGGREGATION_FUNCTIONS[funcName](...args);
    }
    
    /**
     * Process an item through all aggregations
     */
    push(item) {
        for (const { instance, valueExpression } of this.aggregations) {
            const value = valueExpression ? valueExpression(item) : item;
            instance.push(value);
        }
    }
    
    /**
     * Get the final result object with aggregations replaced by their values
     */
    getResult() {
        return this.buildResultRecursively(this.processedSpec);
    }
    
    /**
     * Recursively build result, replacing aggregation placeholders with actual values
     */
    buildResultRecursively(obj) {
        if (typeof obj === 'string' && obj.startsWith('__AGG_') && obj.endsWith('__')) {
            // Replace aggregation placeholder with actual result
            const aggregationEntry = this.aggregations.find(agg => agg.id === obj);
            return aggregationEntry ? aggregationEntry.instance.getResult() : obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.buildResultRecursively(item));
        }
        
        if (obj && typeof obj === 'object' && obj.constructor === Object) {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.buildResultRecursively(value);
            }
            return result;
        }
        
        // Handle context references for primitive values
        if (typeof obj === 'string' && this.context[obj]) {
            return this.context[obj];
        }
        
        // Primitive value, return as-is
        return obj;
    }
    
    /**
     * Reset all aggregations
     */
    reset() {
        for (const { instance } of this.aggregations) {
            instance.reset();
        }
    }
    
    /**
     * Clone this aggregation object for new groups
     */
    clone() {
        return new AggregationObject(this.originalSpec, this.context);
    }
}

/**
 * Helper functions to create aggregation function specifications
 */
export function count() {
    return { _aggregationFunction: 'count', _arguments: [] };
}

export function sum(valueExpression, options = {}) {
    return { _aggregationFunction: 'sum', _arguments: [valueExpression, options] };
} 