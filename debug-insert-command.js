#!/usr/bin/env node

import { CommandParser } from './src/parser/command-parser.js';

const insertCommand = `insert into users {
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

console.log('=== Testing Insert Command Parsing ===');
console.log('Command:', insertCommand);

try {
    // Test 1: Check if it's recognized as a command
    console.log('\n1. Is it recognized as a command?');
    const isCommand = CommandParser.isCommand(insertCommand);
    console.log('isCommand:', isCommand);
    
    // Test 2: Parse command parts
    console.log('\n2. Parse command parts:');
    const parts = CommandParser.parseCommandParts(insertCommand);
    console.log('Command parts:', parts);
    
    // Test 3: Try to execute the command
    console.log('\n3. Execute command:');
    try {
        const result = await CommandParser.executeCommand(insertCommand);
        console.log('✅ Success:', result);
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Stack:', error.stack);
    }
    
} catch (error) {
    console.log('Fatal error:', error.message);
    console.log('Stack:', error.stack);
}