// Fixed Array Indexing Demo
import { CommandParser } from './src/parser/command-parser.js';

const demoCommands = [
  // Clear any existing state first
  'list streams',
  
  // Create streams with "or replace" to handle existing streams
  'create or replace stream users',
  'create or replace stream results',
  
  // Create the flow
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

  // Insert test data
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

console.log('=== Fixed Array Indexing Demo ===\n');

for (let i = 0; i < demoCommands.length; i++) {
  const command = demoCommands[i];
  try {
    console.log(`${i + 1}. ${command.substring(0, 50).replace(/\n/g, ' ')}...`);
    const result = await CommandParser.executeCommand(command);
    console.log(`   ✓ ${result.message}\n`);
  } catch (error) {
    console.error(`   ✗ ${error.message}\n`);
  }
}