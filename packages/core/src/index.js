// Core exports for demo usage
export { StreamManager } from './core/stream-manager.js';
export { QueryEngine } from './core/query-engine.js';
export { default as CommandParser } from './parser/command-parser.js';

// Factory functions for creating instances (no more globals!)
export { createStreamManager, createQueryEngine, createInstances } from './instances.js';

// Core engine components
export { Operator } from './core/operator.js';
export { Stream } from './core/stream.js';
export { ScanOperator } from './operators/scan.js';
export { Filter } from './operators/filter.js';
export { Map } from './operators/map.js';
export { Sorter } from './operators/sorter.js';

// Summarize functionality
export { SummarizeOperator, createSummarizeOperator } from './operators/summarize.js';
export { AggregationObject } from './aggregations/core/aggregation-object.js';
export { 
    tumbling_window, hopping_window, sliding_window, count_window,
    tumbling_window_by, hopping_window_by, sliding_window_by, session_window 
} from './core/window-functions.js';
export { 
    emit_every, emit_when, emit_on_change, emit_on_group_change, emit_on_update,
    emit_every_count, emit_every_interval 
} from './core/emit-functions.js'; 