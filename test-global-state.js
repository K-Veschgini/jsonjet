// Test the global state issue
import { CommandParser } from './src/parser/command-parser.js';

console.log('=== Testing Global State Issue ===\n');

// First, check what streams already exist
console.log('1. Checking existing streams:');
try {
  const listResult = await CommandParser.executeCommand('list streams');
  console.log(listResult.message);
} catch (error) {
  console.log('Error listing streams:', error.message);
}

console.log('\n2. Trying to create a stream that might already exist:');
try {
  const createResult = await CommandParser.executeCommand('create stream results');
  console.log('✓', createResult.message);
} catch (error) {
  console.log('✗', error.message);
}

console.log('\n3. Now trying the insert command:');
const insertCmd = `insert into users {
  "id": 2,
  "name": "Bob"
}`;

try {
  const insertResult = await CommandParser.executeCommand(insertCmd);
  console.log('✓', insertResult.message);
} catch (error) {
  console.log('✗', error.message);
}

console.log('\n4. Testing with stream creation first:');
try {
  const createUserResult = await CommandParser.executeCommand('create stream users');
  console.log('✓', createUserResult.message);
} catch (error) {
  console.log('Create users result:', error.message);
}

try {
  const insertResult2 = await CommandParser.executeCommand(insertCmd);
  console.log('✓', insertResult2.message);
} catch (error) {
  console.log('✗', error.message);
}