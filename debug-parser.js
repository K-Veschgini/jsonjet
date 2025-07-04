#!/usr/bin/env bun
import { transpileQuery } from './src/parser/query-transpiler.js';

// Test the transpilation output
const query = 'sales | summarize { total_amount: sum(amount), count: count() } by product | insert_into(summary_results)';

console.log(`\n=== Transpiling: ${query} ===`);

try {
  const result = transpileQuery(query);
  console.log('✅ Transpilation Success');
  console.log('Generated JavaScript:', result.javascript);
} catch (error) {
  console.log('❌ Transpilation Error:', error.message);
}