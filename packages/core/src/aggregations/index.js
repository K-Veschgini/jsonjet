/**
 * JSDB Aggregations - Browser Registry
 * Browser-safe aggregations only (no Node.js dependencies)
 */

export { Aggregation } from './core/aggregation.js';
export { AggregationExpression } from './core/aggregation-expression.js';
export { AggregationObject } from './core/aggregation-object.js';

// Re-export browser-safe aggregation functions
export { Sum } from './functions/sum.js';
export { Count } from './functions/count.js';

// Import aggregation functions for registration
import { Sum } from './functions/sum.js';
import { Count } from './functions/count.js';

/**
 * Register browser-safe aggregations to a registry instance
 * @param {Registry} registry - Registry instance to register aggregations to
 */
export function registerAggregations(registry) {
    // Register built-in aggregations
    registry.registerAggregation('sum', Sum);
    registry.registerAggregation('count', Count);
}