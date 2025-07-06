// Test the exclusion syntax using the CLI system
import { CommandParser } from './src/parser/command-parser.js';

// Test commands
const commands = [
  'create stream user_data',
  'create stream excluded_output',
  'create flow spread_exclude from user_data | select { ...*, -password, -ssn, safe_age: age || 0 } | insert_into(excluded_output)',
  'insert into user_data {"name": "John", "age": 30, "password": "secret123", "ssn": "123-45-6789"}',
  'insert into user_data {"name": "Jane", "age": 25, "password": "pass456", "ssn": "987-65-4321"}'
];

// Execute commands
for (const command of commands) {
  try {
    console.log(`Executing: ${command}`);
    const result = await CommandParser.executeCommand(command);
    console.log('✓ Success:', result.message);
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
  }
}

// Check results
console.log('\n=== Results ===');
try {
  const listResult = await CommandParser.executeCommand('list streams');
  console.log('Available streams:', listResult.message);
} catch (error) {
  console.error('Error listing streams:', error.message);
}