import { streamManager } from '../src/core/stream-manager.js';
import { queryEngine } from '../src/core/query-engine.js';

console.log('=== JSDB Flow Processing Demo ===\n');

async function flowDemo() {
    try {
        // 1. Create streams
        console.log('📊 Creating streams...');
        await queryEngine.executeStatement('create stream events');
        await queryEngine.executeStatement('create stream metrics');
        await queryEngine.executeStatement('create stream archive');

        // 2. Create flows (persistent queries)
        console.log('\n🔄 Creating flows...');
        
        // High value events flow - archives to another stream
        await queryEngine.executeStatement(
            'create flow high_value from events | where value > 100 | insert_into(archive)'
        );

        // Temporary monitoring flow (60 second TTL) - writes to a results stream
        await queryEngine.executeStatement(
            'create flow temp_monitor ttl(60s) from metrics | project { id: id, doubled: value * 2 } | insert_into(monitor_results)'
        );
        
        // Create result streams
        await queryEngine.executeStatement('create stream monitor_results');
        
        // Subscribe to result streams to see outputs
        const archiveSubId = streamManager.subscribeToStream('archive', 
            (result) => console.log('💰 High Value:', result)
        );
        
        const monitorSubId = streamManager.subscribeToStream('monitor_results', 
            (result) => console.log('📈 Temp Monitor:', result)
        );

        // 3. Insert test data
        console.log('\n📤 Inserting test data...');
        await queryEngine.executeStatement('insert into events { id: 1, value: 150 }');
        await queryEngine.executeStatement('insert into events { id: 2, value: 50 }');
        await queryEngine.executeStatement('insert into metrics { id: 1, value: 25 }');

        // 4. Wait and insert more data
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('\n📤 Inserting more data...');
        await queryEngine.executeStatement('insert into events { id: 3, value: 200 }');
        await queryEngine.executeStatement('insert into metrics { id: 2, value: 75 }');

        // 5. List active flows
        console.log('\n📋 Active flows:');
        const result = await queryEngine.executeStatement('list flows');
        console.log(result);

        // 6. Delete a flow
        console.log('\n🗑️ Deleting high_value flow...');
        await queryEngine.executeStatement('delete flow high_value');
        
        // 7. Unsubscribe from streams
        console.log('\n🔌 Unsubscribing from streams...');
        streamManager.unsubscribeFromStream(archiveSubId);
        streamManager.unsubscribeFromStream(monitorSubId);

        console.log('\n✅ Demo completed!');
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    }
}

flowDemo();