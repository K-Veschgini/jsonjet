// Test what happens with duplicate stream creation
import { CommandParser } from './src/parser/command-parser.js';

const commands = [
  'create stream results',
  'create stream results',  // This should fail
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

console.log('Testing duplicate stream creation and insert...\n');

for (let i = 0; i < commands.length; i++) {
  const command = commands[i];
  try {
    console.log(`${i + 1}. Executing: ${command.substring(0, 50).replace(/\n/g, ' ')}...`);
    const result = await CommandParser.executeCommand(command);
    console.log(`   ✓ Success: ${result.message}\n`);
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}\n`);
    
    // Check if the error message makes sense for the command
    if (command.startsWith('insert') && error.message.includes("Stream 'results' already exists")) {
      console.error('   🐛 BUG DETECTED: Insert command is getting wrong error message!');
      console.error('   This suggests command parsing confusion.');
    }
  }
}