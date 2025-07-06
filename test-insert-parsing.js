// Test the insert statement parsing
import { CommandParser } from './src/parser/command-parser.js';

const commands = [
  'create stream users',
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
}`
];

for (const command of commands) {
  try {
    console.log(`Testing: ${command.substring(0, 50)}...`);
    const result = await CommandParser.executeCommand(command);
    console.log('✓ Success:', result.message);
  } catch (error) {
    console.error('✗ Error:', error.message);
    break;
  }
}