// Test a simple demo command
import { CommandParser } from './src/parser/command-parser.js';

console.log('Testing simple create command...');

try {
  const result = await CommandParser.executeCommand('create stream test');
  console.log('✓ Success:', result.message);
} catch (error) {
  console.error('✗ Error:', error.message);
  console.error('Full error:', error);
}

// Test list command
try {
  const result = await CommandParser.executeCommand('list streams');
  console.log('✓ List:', result.message);
} catch (error) {
  console.error('✗ List error:', error.message);
}