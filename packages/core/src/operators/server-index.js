/**
 * JSDB Stream Operators - Server Registry
 * Extends browser registry with server-only operators (Node.js dependencies)
 */

// Import browser registration function
import { registerOperators } from './index.js';

// Import server-only operators
import { WriteToFile } from './write-to-file.js';
import { AssertOrSaveExpected } from './assert-or-save-expected.js';

/**
 * Register server operators (browser-safe + server-only) to a registry instance
 * @param {Registry} registry - Registry instance to register operators to
 */
export function registerServerOperators(registry) {
    // Register browser-safe operators first
    registerOperators(registry);
    
    // Register server-only operators
    registry.registerOperator('writetofile', WriteToFile);
    registry.registerOperator('write_to_file', WriteToFile); // Alias
    registry.registerOperator('assertorsaveexpected', AssertOrSaveExpected);
    registry.registerOperator('assert_or_save_expected', AssertOrSaveExpected); // Alias
}

// Re-export browser registration function for convenience
export { registerOperators };

// Export server-only operators for direct access
export { WriteToFile, AssertOrSaveExpected };

// Re-export all browser operators
export {
  Filter, InsertInto, Map, ScanOperator, Select, Sorter, SummarizeOperator, createSummarizeOperator,
  count, sum,
  hopping_window, tumbling_window, sliding_window, count_window, session_window,
  hopping_window_by, tumbling_window_by, sliding_window_by,
  emit_every, emit_when, emit_on_change, emit_on_group_change, emit_on_update
} from './index.js';