// Test transpiler directly
import { transpileQuery } from './src/parser/query-transpiler.js';

const testQueries = [
  'events | where amount > 100',
  'events | select { id: id, amount: amount }',
  'events | where amount > 100 | insert_into(results)'
];

for (const query of testQueries) {
  try {
    console.log(`Testing: ${query}`);
    const result = transpileQuery(query);
    console.log('✓ Transpiled successfully');
  } catch (error) {
    console.error('✗ Transpilation failed:', error.message);
    console.error('Full error:', error);
    break;
  }
}