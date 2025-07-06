// Debug the exact parsing issue
import { CommandParser } from './src/parser/command-parser.js';

const problematicCommand = `insert into users {
  "id": 2,
  "name": "Bob",
  "scores": [88, 76, 91], 
  "hobbies": ["gaming", "music"],
  "contacts": {
    "emails": ["bob@company.com"],
    "phones": ["555-9999"]
  },
  "projects": [
    {"name": "API", "status": "planning", "team": ["Bob", "Dave"]}
  ]
}`;

console.log('=== Debugging Command Parsing ===\n');

// First, let's see how the command gets parsed into parts
console.log('1. Testing parseCommandParts:');
try {
  const parts = CommandParser.parseCommandParts(problematicCommand);
  console.log('Parsed parts:');
  parts.forEach((part, i) => {
    console.log(`  [${i}]: "${part}"`);
  });
  
  console.log(`\nFirst part (action): "${parts[0]}"`);
  console.log(`Second part: "${parts[1]}"`);
  console.log(`Third part: "${parts[2]}"`);
  
} catch (error) {
  console.error('Error in parseCommandParts:', error.message);
}

console.log('\n2. Testing command execution:');

// Create streams first
try {
  await CommandParser.executeCommand('create stream users');
  console.log('✓ Stream created');
} catch (error) {
  console.log('Stream creation result:', error.message);
}

// Now test the problematic insert
try {
  const result = await CommandParser.executeCommand(problematicCommand);
  console.log('✓ Insert successful:', result.message);
} catch (error) {
  console.error('✗ Insert failed:', error.message);
  console.error('Full error object:', error);
}

console.log('\n3. Testing simplified version:');
const simpleInsert = 'insert into users {"id": 2, "name": "Bob"}';
try {
  const result = await CommandParser.executeCommand(simpleInsert);
  console.log('✓ Simple insert successful:', result.message);
} catch (error) {
  console.error('✗ Simple insert failed:', error.message);
}