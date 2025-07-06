// Test the fixed array indexing demo
import { CommandParser } from './src/parser/command-parser.js';

// Test just the problematic part of the demo
const testCommands = [
  'create or replace stream users',
  'create or replace stream results',
  `create or replace flow basic_indexing from users 
| select { 
    id: id, 
    name: name, 
    firstScore: scores[0], 
    secondScore: scores[1],
    thirdScore: scores[2],
    firstHobby: hobbies[0]
  } 
| insert_into(results)`,
  `insert into users {
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
}`
];

console.log('=== Testing Fixed Array Demo ===\n');

for (let i = 0; i < testCommands.length; i++) {
  const command = testCommands[i];
  try {
    console.log(`${i + 1}. ${command.substring(0, 50).replace(/\n/g, ' ')}...`);
    const result = await CommandParser.executeCommand(command);
    console.log(`   ✓ ${result.message}\n`);
  } catch (error) {
    console.error(`   ✗ ${error.message}\n`);
    break;
  }
}

console.log('=== Testing Repeat Execution (should not fail) ===\n');

// Run the same commands again to simulate running the demo twice
for (let i = 0; i < testCommands.length; i++) {
  const command = testCommands[i];
  try {
    console.log(`Re-run ${i + 1}. ${command.substring(0, 30)}...`);
    const result = await CommandParser.executeCommand(command);
    console.log(`   ✓ ${result.message}\n`);
  } catch (error) {
    console.error(`   ✗ ${error.message}\n`);
    break;
  }
}