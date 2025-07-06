// Test what happens when create or replace is sent to query transpiler vs command parser
import { transpileQuery } from './src/parser/query-transpiler.js';
import { CommandParser } from './src/parser/command-parser.js';

const statement = 'create or replace stream events';

console.log('=== Testing Query Transpiler (WRONG) ===');
try {
  const result = transpileQuery(statement);
  console.log('✓ Query transpiler succeeded:', result.javascript);
} catch (error) {
  console.error('✗ Query transpiler failed:', error.message);
}

console.log('\n=== Testing Command Parser (CORRECT) ===');
try {
  const result = await CommandParser.executeCommand(statement);
  console.log('✓ Command parser succeeded:', result.message);
} catch (error) {
  console.error('✗ Command parser failed:', error.message);
}