/**
 * JSDB Stream Operators - Server Registry
 * Extends browser registry with server-only operators (Node.js dependencies)
 */

// Import browser registry first (gets all browser-safe operators)
import { operatorRegistry } from './index.js';

// Import server-only operators
import { WriteToFile } from './write-to-file.js';
import { AssertOrSaveExpected } from './assert-or-save-expected.js';

// Server-only operators list
const SERVER_ONLY_OPERATORS = [
  { name: 'write_to_file', class: WriteToFile },
  { name: 'assert_or_save_expected', class: AssertOrSaveExpected },
];

// Register server-only operators to existing registry
SERVER_ONLY_OPERATORS.forEach(({ name, class: OperatorClass }) => {
  operatorRegistry.register(name, OperatorClass);
});

// Re-export the enhanced registry and all operators
export { operatorRegistry };
export { WriteToFile, AssertOrSaveExpected };

// Re-export all browser operators
export {
  Filter, InsertInto, Map, ScanOperator, Select, Sorter, SummarizeOperator, createSummarizeOperator,
  count, sum,
  hopping_window, tumbling_window, sliding_window, count_window, session_window,
  hopping_window_by, tumbling_window_by, sliding_window_by,
  emit_every, emit_when, emit_on_change, emit_on_group_change, emit_on_update
} from './index.js';