// Test with semicolon like in the demo
import { CommandParser } from './src/parser/command-parser.js';

console.log('Testing commands with semicolons...');

const commands = [
  'create or replace stream events;',
  'create flow test from events | where amount > 100 | insert_into(results);'
];

for (const command of commands) {
  try {
    console.log(`Testing: ${command}`);
    const result = await CommandParser.executeCommand(command);
    console.log('✓ Success:', result.message);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('Full error:', error);
    break;
  }
}