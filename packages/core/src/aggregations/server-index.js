/**
 * JSDB Aggregations - Server Registry
 * Extends browser registry with server-only aggregations (Node.js dependencies)
 */

// Import browser registry first
import { aggregationRegistry } from './core/aggregation-registry.js';

// Server-only aggregations (empty for now - add server aggregations here when needed)
// aggregationRegistry.register('server_agg_name', ServerAggClass);

// Re-export the enhanced registry
export { aggregationRegistry };
export { Aggregation } from './core/aggregation.js';
export { AggregationExpression } from './core/aggregation-expression.js';
export { AggregationObject } from './core/aggregation-object.js';