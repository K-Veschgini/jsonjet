/**
 * Register all existing operators to a Registry instance
 */

import { Filter } from '../operators/filter.js';
import { InsertInto } from '../operators/insert-into.js';
import { Map } from '../operators/map.js';
import { ScanOperator } from '../operators/scan.js';
import { Select } from '../operators/select.js';
import { Sorter } from '../operators/sorter.js';
import { SummarizeOperator } from '../operators/summarize.js';
import { WriteToFile } from '../operators/write-to-file.js';
import { AssertOrSaveExpected } from '../operators/assert-or-save-expected.js';

/**
 * Register all operators to a registry instance
 * @param {Registry} registry - Registry instance to register operators to
 */
export function registerOperators(registry) {
    // Register stream operators
    registry.registerOperator('filter', Filter);
    registry.registerOperator('insertinto', InsertInto);
    registry.registerOperator('insert_into', InsertInto); // Alias
    registry.registerOperator('map', Map);
    registry.registerOperator('scan', ScanOperator);
    registry.registerOperator('select', Select);
    registry.registerOperator('sorter', Sorter);
    registry.registerOperator('sort', Sorter); // Alias
    registry.registerOperator('summarize', SummarizeOperator);
    registry.registerOperator('writetofile', WriteToFile);
    registry.registerOperator('write_to_file', WriteToFile); // Alias
    registry.registerOperator('assertorsaveexpected', AssertOrSaveExpected);
    registry.registerOperator('assert_or_save_expected', AssertOrSaveExpected); // Alias
}