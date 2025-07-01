import { Stream, Map, Operator } from '../src/index.js';

// Async operator with variable delay
class DelayedProcessor extends Operator {
    constructor(name, delay) {
        super();
        this.name = name;
        this.delay = delay;
    }
    
    async process(doc) {
        console.log(`🔄 ${this.name} started processing ${doc.id} (${this.delay}ms delay)`);
        
        await new Promise(resolve => setTimeout(resolve, this.delay));
        
        const result = {
            ...doc,
            processedBy: this.name,
            processedAt: new Date().toLocaleTimeString()
        };
        
        this.emit(result);
    }
}

async function main() {
    console.log('🚀 Testing await pipeline.finish()\n');
    
    // Create pipeline with async processing
    const pipeline = new Stream()
        .pipe(new DelayedProcessor('Processor', 300))
        .pipe(new Map(doc => ({ ...doc, final: true })))
        .collect(result => console.log('✅ Result:', result));
    
    // Send multiple documents
    console.log('📥 Sending 3 documents...');
    pipeline.push({ id: 'doc1', value: 100 });
    pipeline.push({ id: 'doc2', value: 200 });
    pipeline.push({ id: 'doc3', value: 300 });
    
    console.log('⏳ Waiting for all processing to complete...\n');
    
    // Wait for all processing to finish
    await pipeline.finish();
    
    console.log('\n🎉 All processing complete! No more pending operations.');
    console.log('✨ Clean exit without timeouts or guessing!');
}

main().catch(console.error); 