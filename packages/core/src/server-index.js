/**
 * JSDB Core - Server Registry (Full Features)
 * Extends browser registry with server-only components (Node.js dependencies)
 */

// Core components
export { Operator } from './core/operator.js';
export { Stream } from './core/stream.js';

// Import and register ALL functions, aggregations, and operators (browser + server)
import './functions/server-index.js';     // Registers all scalar functions
import './aggregations/server-index.js';  // Registers all aggregations
import './operators/server-index.js';     // Registers all operators

// Re-export enhanced registries  
// Note: functionRegistry and aggregationRegistry removed - components should create their own Registry instances

// Export function registration functions (no global registry)
export { registerFunctions, registerServerFunctions } from './functions/server-index.js';

// Export aggregation registration functions (no global registry)
export { registerAggregations, registerServerAggregations } from './aggregations/server-index.js';

// Export operator registration functions (no global registry)
export { registerOperators, registerServerOperators } from './operators/server-index.js';

// Re-export all operators (browser + server)
export {
    Filter, InsertInto, Map, ScanOperator, Select, Sorter, 
    SummarizeOperator, createSummarizeOperator,
    WriteToFile, AssertOrSaveExpected
} from './operators/server-index.js';

// Re-export aggregation utilities
export { AggregationObject } from './aggregations/core/aggregation-object.js';

// Re-export window and emit functions
export { 
    tumbling_window, hopping_window, sliding_window, count_window,
    tumbling_window_by, hopping_window_by, sliding_window_by, session_window 
} from './core/window-functions.js';
export { 
    emit_every, emit_when, emit_on_change, emit_on_group_change, emit_on_update,
    emit_every_count, emit_every_interval 
} from './core/emit-functions.js';