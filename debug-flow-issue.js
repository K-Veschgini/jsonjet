import { StreamManager } from './src/core/stream-manager.js';
import { QueryEngine } from './src/core/query-engine.js';

console.log('=== DEBUGGING FLOW PROCESSING ISSUE ===\n');

async function testBasicFlow() {
    const streamManager = new StreamManager();
    const queryEngine = new QueryEngine(streamManager);
    
    console.log('1. Creating streams...');
    streamManager.createStream('user_data');
    streamManager.createStream('archive');
    console.log('✅ Streams created:', streamManager.listStreams());
    
    console.log('\n2. Setting up data collection...');
    const results = [];
    const subscriptionId = streamManager.subscribeToStream('archive', (message) => {
        console.log('📤 Received in archive:', message.data);
        results.push(message.data);
    });
    
    console.log('\n3. Creating flow...');
    const query = 'create flow process_users from user_data | where age > 18 | project { name: name, age: age, status: "processed" } | insert_into(archive)';
    console.log('Query:', query);
    
    try {
        const flowResult = await queryEngine.executeStatement(query);
        console.log('Flow result:', flowResult);
        
        if (!flowResult.success) {
            console.error('❌ Flow creation failed!');
            console.error('Error details:', flowResult.message);
            
            // Try to get more detailed error info
            console.log('\n--- Trying to debug transpilation ---');
            const { transpileQuery } = await import('./src/parser/query-transpiler.js');
            try {
                const pipelineQuery = 'user_data | where age > 18 | project { name: name, age: age, status: "processed" } | insert_into(archive)';
                const transpileResult = transpileQuery(pipelineQuery);
                console.log('Transpilation result:', transpileResult.javascript);
            } catch (transpileError) {
                console.error('❌ Transpilation error:', transpileError.message);
                console.error('Stack:', transpileError.stack);
            }
            
            return;
        }
        
        console.log('✅ Flow created successfully');
        
        console.log('\n4. Checking active flows...');
        const activeFlows = queryEngine.getActiveFlows();
        console.log('Active flows:', activeFlows.length);
        activeFlows.forEach(flow => {
            console.log(`  - ${flow.queryId}: ${flow.sourceStream}`);
        });
        
        console.log('\n5. Inserting test data...');
        await streamManager.insertIntoStream('user_data', { name: 'Alice', age: 25, city: 'NYC' });
        console.log('✅ Inserted Alice (age 25)');
        
        await streamManager.insertIntoStream('user_data', { name: 'Bob', age: 16, city: 'LA' });
        console.log('✅ Inserted Bob (age 16) - should be filtered');
        
        await streamManager.insertIntoStream('user_data', { name: 'Carol', age: 30, city: 'SF' });
        console.log('✅ Inserted Carol (age 30)');
        
        console.log('\n6. Waiting for processing...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('\n7. Results:');
        console.log(`Results received: ${results.length}`);
        results.forEach((result, i) => {
            console.log(`  ${i + 1}:`, result);
        });
        
        if (results.length === 0) {
            console.log('❌ NO RESULTS! Pipeline is broken.');
            console.log('This means data is not flowing through the pipeline.');
        } else if (results.length === 2) {
            console.log('✅ Correct! 2 results (Bob filtered out)');
        } else {
            console.log(`❌ Wrong count! Expected 2, got ${results.length}`);
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        streamManager.unsubscribeFromStream(subscriptionId);
    }
}

testBasicFlow().then(() => {
    console.log('\n=== DEBUG COMPLETE ===');
}).catch(error => {
    console.error('💥 Test failed:', error);
});