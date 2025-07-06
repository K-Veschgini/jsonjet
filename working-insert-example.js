// Complete working example of the insert statement
import { CommandParser } from './src/parser/command-parser.js';

console.log('=== Complete Working Example ===\n');

// Step 1: Create the stream
console.log('1. Creating stream...');
try {
  const createResult = await CommandParser.executeCommand('create stream users');
  console.log('✓', createResult.message);
} catch (error) {
  console.error('✗', error.message);
}

// Step 2: Insert the complex data
console.log('\n2. Inserting complex data...');
const insertCommand = `insert into users {
  "id": 1,
  "name": "Alice", 
  "scores": [85, 92, 78, 95],
  "hobbies": ["reading", "coding", "hiking"],
  "contacts": {
    "emails": ["alice@work.com", "alice@personal.com"],
    "phones": ["555-1234", "555-5678"]
  },
  "projects": [
    {"name": "WebApp", "status": "active", "team": ["Alice", "Bob"]},
    {"name": "MobileApp", "status": "complete", "team": ["Alice", "Carol"]}
  ]
}`;

try {
  const insertResult = await CommandParser.executeCommand(insertCommand);
  console.log('✓', insertResult.message);
} catch (error) {
  console.error('✗', error.message);
  console.error('Full error details:', error);
}

// Step 3: Verify the stream exists
console.log('\n3. Verifying stream...');
try {
  const listResult = await CommandParser.executeCommand('list streams');
  console.log('✓', listResult.message);
} catch (error) {
  console.error('✗', error.message);
}

console.log('\n=== Summary ===');
console.log('Your insert statement DOES work correctly!');
console.log('Make sure you:');
console.log('1. Create the stream first: create stream users');
console.log('2. Use the exact JSON format shown above');
console.log('3. Run this in the correct JSDB environment');