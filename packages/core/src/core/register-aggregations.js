/**
 * Register all existing aggregation functions to a Registry instance
 */

import { Sum } from '../aggregations/functions/sum.js';
import { Count } from '../aggregations/functions/count.js';

/**
 * Register all aggregation functions to a registry instance
 * @param {Registry} registry - Registry instance to register aggregations to
 */
export function registerAggregations(registry) {
    // Register built-in aggregations
    registry.registerAggregation('sum', Sum);
    registry.registerAggregation('count', Count);
}