import { StreamManager } from './src/core/stream-manager.js';
import { QueryEngine } from './src/core/query-engine.js';

console.log('=== DEBUGGING SELECT FLOW ===\n');

const streamManager = new StreamManager();
const queryEngine = new QueryEngine(streamManager);

// Create streams
console.log('1. Creating streams...');
streamManager.createStream('user_data');
streamManager.createStream('clean_output');
console.log('Created streams:', streamManager.listStreams());

// Set up monitoring
const allMessages = [];
const globalSub = streamManager.subscribeToAllStreams((message) => {
  console.log(`📨 [${message.streamName}] Received:`, JSON.stringify(message.data));
  allMessages.push({ stream: message.streamName, data: message.data });
});

try {
  console.log('\n2. Creating select flow...');
  
  // Test the exact query from the demo
  const query = 'create flow basic_select from user_data | select { name: name, age: age, email: email } | insert_into(clean_output)';
  console.log('Query:', query);
  
  const flowResult = await queryEngine.executeStatement(query);
  console.log('Flow result:', flowResult);
  
  if (!flowResult.success) {
    console.error('❌ Flow creation failed!');
    console.error('Error:', flowResult.message);
    process.exit(1);
  }
  
  console.log('✅ Flow created successfully');
  
  console.log('\n3. Checking active flows...');
  const activeFlows = queryEngine.getActiveFlows();
  console.log('Active flows count:', activeFlows.length);
  activeFlows.forEach((flow, i) => {
    console.log(`  Flow ${i}: ${flow.sourceStream} -> [processing] -> target`);
    console.log(`    Query ID: ${flow.queryId}`);
  });
  
  console.log('\n4. Inserting test data...');
  const testData = { 
    name: 'John',
    age: 30,
    email: 'john@example.com',
    password: 'secret123',
    extra: 'should be filtered out'
  };
  
  console.log('Inserting:', testData);
  await streamManager.insertIntoStream('user_data', testData);
  console.log('✅ Data inserted');
  
  console.log('\n5. Waiting for processing...');
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log('\n6. Results:');
  console.log('Total messages received:', allMessages.length);
  
  const userDataMessages = allMessages.filter(m => m.stream === 'user_data');
  const cleanOutputMessages = allMessages.filter(m => m.stream === 'clean_output');
  
  console.log('\nuser_data messages:', userDataMessages.length);
  userDataMessages.forEach(msg => console.log('  -', JSON.stringify(msg.data)));
  
  console.log('\nclean_output messages:', cleanOutputMessages.length);
  cleanOutputMessages.forEach(msg => console.log('  -', JSON.stringify(msg.data)));
  
  if (cleanOutputMessages.length === 0) {
    console.log('\n❌ PROBLEM: No data in clean_output!');
    console.log('This means the select pipeline is not working.');
    
    if (userDataMessages.length === 0) {
      console.log('   - Data didn\'t even reach user_data stream');
    } else {
      console.log('   - Data reached user_data but didn\'t flow through select');
    }
  } else {
    console.log('\n✅ SUCCESS: Data flowed through select pipeline');
    const result = cleanOutputMessages[0].data;
    console.log('Selected fields:', Object.keys(result));
    console.log('Expected: name, age, email');
    console.log('Got excluded fields?', 'password' in result || 'extra' in result ? 'YES (BAD)' : 'NO (GOOD)');
  }
  
} catch (error) {
  console.error('💥 Error:', error.message);
  console.error('Stack:', error.stack);
} finally {
  streamManager.unsubscribeFromAllStreams(globalSub);
}

console.log('\n=== DEBUG COMPLETE ===');