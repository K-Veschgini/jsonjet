// Test through CLI interface
import { StreamManager } from './src/core/stream-manager.js';
import { QueryEngine } from './src/core/query-engine.js';
import DurationParser from './src/utils/duration-parser.js';

const streamManager = new StreamManager();
const queryEngine = new QueryEngine(streamManager);

// Test the exact command structure used in CLI
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
  // Create stream first
  await streamManager.createStream('users');
  console.log('Stream created successfully');
  
  // Test parsing the insert command manually
  console.log('\nTesting JSON parsing...');
  const jsonStart = insertCommand.indexOf('{');
  const jsonPart = insertCommand.substring(jsonStart);
  
  try {
    const parsed = JSON.parse(jsonPart);
    console.log('✓ JSON parsing successful');
    console.log('Parsed object keys:', Object.keys(parsed));
    console.log('Nested arrays/objects detected:', {
      scores: Array.isArray(parsed.scores),
      hobbies: Array.isArray(parsed.hobbies),
      contacts: typeof parsed.contacts === 'object',
      projects: Array.isArray(parsed.projects)
    });
  } catch (jsonError) {
    console.error('✗ JSON parsing failed:', jsonError.message);
  }
  
} catch (error) {
  console.error('Error:', error.message);
}