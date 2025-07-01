import { Stream, Filter, Map } from '../src/index.js';

async function main() {
    console.log('🚀 Testing await pipeline.finish() with filtering\n');
    
    // Create pipeline that filters out half the documents
    const pipeline = new Stream()
        .pipe(new Filter(doc => {
            const passes = doc.value > 50;
            console.log(`🔍 Filter: ${doc.id} (value: ${doc.value}) → ${passes ? 'PASS' : 'REJECT'}`);
            return passes;
        }))
        .pipe(new Map(doc => {
            console.log(`🔄 Map processing: ${doc.id}`);
            return { ...doc, processed: true };
        }))
        .collect(result => console.log('✅ Final result:', result));
    
    // Send 6 documents, but only ~3 should pass the filter
    console.log('📥 Sending 6 documents (only those with value > 50 will pass)...');
    pipeline.push({ id: 'doc1', value: 25 }); // Will be filtered out
    pipeline.push({ id: 'doc2', value: 75 }); // Will pass
    pipeline.push({ id: 'doc3', value: 30 }); // Will be filtered out  
    pipeline.push({ id: 'doc4', value: 90 }); // Will pass
    pipeline.push({ id: 'doc5', value: 10 }); // Will be filtered out
    pipeline.push({ id: 'doc6', value: 60 }); // Will pass
    
    console.log('\n⏳ Waiting for all processing to complete...\n');
    
    // This should work correctly even though fewer results come out than went in
    await pipeline.finish();
    
    console.log('\n🎉 All processing complete!');
    console.log('✨ Notice: 6 documents pushed, but only 3 made it through the filter.');
    console.log('🔧 The finish() method correctly tracked completion at each operator stage!');
}

main().catch(console.error); 