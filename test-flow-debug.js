// Test flow creation to debug the parsing issue
import { CommandParser } from './src/parser/command-parser.js';

console.log('Testing flow creation...');

// First create streams
try {
  await CommandParser.executeCommand('create stream events');
  console.log('✓ Stream created');
} catch (error) {
  console.error('✗ Stream creation failed:', error.message);
}

// Now test a simple flow
try {
  const result = await CommandParser.executeCommand('create flow test from events | where amount > 100 | insert_into(results)');
  console.log('✓ Flow created:', result.message);
} catch (error) {
  console.error('✗ Flow creation failed:', error.message);
  console.error('Full error:', error);
}