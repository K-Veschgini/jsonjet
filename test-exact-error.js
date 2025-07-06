// Test the exact command that's failing
import { CommandParser } from './src/parser/command-parser.js';

console.log('Testing the exact failing command...');

try {
  const result = await CommandParser.executeCommand('create or replace stream events');
  console.log('✓ Success:', result.message);
} catch (error) {
  console.error('✗ Error:', error.message);
  console.error('Full error:', error);
}

// Test without semicolon
try {
  const result = await CommandParser.executeCommand('create or replace stream events');
  console.log('✓ Success without semicolon:', result.message);
} catch (error) {
  console.error('✗ Error without semicolon:', error.message);
}