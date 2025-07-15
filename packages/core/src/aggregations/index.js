/**
 * JSDB Aggregations - Browser Registry
 * Browser-safe aggregations only (no Node.js dependencies)
 */

export { aggregationRegistry } from './core/aggregation-registry.js';
export { Aggregation } from './core/aggregation.js';
export { AggregationExpression } from './core/aggregation-expression.js';
export { AggregationObject } from './core/aggregation-object.js';

// Re-export browser-safe aggregation functions
export { Sum } from './functions/sum.js';
export { Count } from './functions/count.js';