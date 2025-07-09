export { Filter } from './filter.js';
export { InsertInto } from './insert-into.js';
export { Map } from './map.js';
export { ScanOperator } from './scan.js';
export { Select } from './select.js';
export { Sorter } from './sorter.js';
export { SummarizeOperator, createSummarizeOperator } from './summarize.js';

// Re-export aggregation functions as factory functions
import { Count } from '../aggregations/functions/count.js';
import { Sum } from '../aggregations/functions/sum.js';

export const count = (...args) => new Count(...args);
export const sum = (...args) => new Sum(...args);

// Re-export window functions
export { 
    hopping_window, tumbling_window, sliding_window, count_window, session_window,
    hopping_window_by, tumbling_window_by, sliding_window_by
} from '../core/window-functions.js';

// Re-export emit functions
export { 
    emit_every, emit_when, emit_on_change, emit_on_group_change, emit_on_update
} from '../core/emit-functions.js'; 