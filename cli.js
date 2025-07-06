#!/usr/bin/env node

import { StreamManager } from './src/core/stream-manager.js';
import { QueryEngine } from './src/core/query-engine.js';
import process from 'process';
import readline from 'readline';

// Create global instances
const streamManager = new StreamManager();
const queryEngine = new QueryEngine(streamManager);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

console.log('JSDB CLI - Enter queries (Ctrl+C to exit)');

// Process each line
rl.on('line', async (line) => {
  try {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    if (trimmed === '.exit') {
      process.exit(0);
    }
    
    if (trimmed.startsWith('.flush ')) {
      const streamName = trimmed.substring(7).trim();
      try {
        const data = await streamManager.flushStream(streamName);
        console.log(`Stream '${streamName}' data:`, JSON.stringify(data, null, 2));
      } catch (error) {
        console.error(`Error flushing stream: ${error.message}`);
      }
      return;
    }
    
    const result = await queryEngine.executeStatement(trimmed);
    
    if (result.error) {
      console.error('❌ Failed:', result.error);
    } else if (result.success) {
      console.log('✅ Success:', result.message || 'Statement executed');
      if (result.data) {
        console.log('Data:', JSON.stringify(result.data, null, 2));
      }
    } else {
      console.log('Result:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
});

rl.on('close', () => {
  console.log('\nGoodbye!');
  process.exit(0);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nGoodbye!');
  process.exit(0);
});