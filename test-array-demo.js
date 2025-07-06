// Test the exact array indexing demo code
import { CommandParser } from './src/parser/command-parser.js';

const commands = [
  'create stream users',
  'create stream results',
  `create flow basic_indexing from users 
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
}`,
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

console.log('Testing array indexing demo commands...\n');

for (let i = 0; i < commands.length; i++) {
  const command = commands[i];
  try {
    console.log(`${i + 1}. Executing: ${command.substring(0, 50).replace(/\n/g, ' ')}...`);
    const result = await CommandParser.executeCommand(command);
    console.log(`   ✓ Success: ${result.message}\n`);
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}\n`);
    console.error(`   Full error:`, error);
    break;
  }
}