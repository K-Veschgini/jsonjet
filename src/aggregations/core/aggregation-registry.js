import { Sum } from '../functions/sum.js';
import { Count } from '../functions/count.js';

/**
 * Registry for aggregation functions
 */
class AggregationRegistry {
    constructor() {
        this.aggregations = new Map();
        this._registerBuiltins();
    }
    
    /**
     * Register built-in aggregations
     */
    _registerBuiltins() {
        this.register('sum', Sum);
        this.register('count', Count);
    }
    
    /**
     * Register an aggregation class
     * @param {string} name - Function name
     * @param {class} AggregationClass - Aggregation class constructor
     */
    register(name, AggregationClass) {
        this.aggregations.set(name.toLowerCase(), AggregationClass);
    }
    
    /**
     * Create a new aggregation instance
     * @param {string} name - Function name
     * @param {...any} args - Constructor arguments
     * @returns {Aggregation} New aggregation instance
     */
    create(name, ...args) {
        const AggregationClass = this.aggregations.get(name.toLowerCase());
        if (!AggregationClass) {
            throw new Error(`Unknown aggregation function: ${name}`);
        }
        return new AggregationClass(...args);
    }
    
    /**
     * Check if aggregation exists
     * @param {string} name - Function name
     * @returns {boolean}
     */
    has(name) {
        return this.aggregations.has(name.toLowerCase());
    }
    
    /**
     * Get all registered aggregation names
     * @returns {string[]}
     */
    getNames() {
        return Array.from(this.aggregations.keys());
    }
}

// Export singleton instance
export const aggregationRegistry = new AggregationRegistry();