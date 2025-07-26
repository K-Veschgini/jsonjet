/**
 * JSONJet Aggregations - Server Registry
 * Extends browser registry with server-only aggregations (Node.js dependencies)
 */

// Import browser registration function
import { registerAggregations } from './index.js';

// Server-only aggregations (empty for now - add server aggregations here when needed)
const SERVER_ONLY_AGGREGATIONS = [
    // Add server-only aggregations here when implemented
];

/**
 * Register server aggregations (browser-safe + server-only) to a registry instance
 * @param {Registry} registry - Registry instance to register aggregations to
 */
export function registerServerAggregations(registry) {
    // Register browser-safe aggregations first
    registerAggregations(registry);
    
    // Register server-only aggregations when available
    SERVER_ONLY_AGGREGATIONS.forEach(({ name, class: AggregationClass }) => {
        registry.registerAggregation(name, AggregationClass);
    });
}

// Re-export browser registration function for convenience  
export { registerAggregations };
export { Aggregation } from './core/aggregation.js';
export { AggregationExpression } from './core/aggregation-expression.js';
export { AggregationObject } from './core/aggregation-object.js';