import { Stream, Filter, Map, Operator } from '../src/index.js';

// Async operator that simulates slow mathematical computation
class SlowMath extends Operator {
    constructor(name, delay) {
        super();
        this.name = name;
        this.delay = delay;
    }
    
    async process(doc) {
        console.log(`🔄 ${this.name} started processing ${doc.id} (delay: ${this.delay}ms)`);
        
        // Simulate async computation
        await new Promise(resolve => setTimeout(resolve, this.delay));
        
        const result = {
            ...doc,
            pipeline: this.name,
            computed: Math.pow(doc.value, 2) + Math.random() * 100,
            processedAt: new Date().toLocaleTimeString()
        };
        
        this.emit(result);
    }
}

// Async operator that simulates database operation
class DatabaseOp extends Operator {
    constructor(name, delay) {
        super();
        this.name = name;
        this.delay = delay;
    }
    
    async process(doc) {
        console.log(`💾 ${this.name} database lookup for ${doc.id} (delay: ${this.delay}ms)`);
        
        // Simulate async database call
        await new Promise(resolve => setTimeout(resolve, this.delay));
        
        const result = {
            ...doc,
            database: this.name,
            enriched: `data_${doc.value}_${Math.floor(Math.random() * 1000)}`,
            lookupTime: new Date().toLocaleTimeString()
        };
        
        this.emit(result);
    }
}

console.log('🚀 Parallel Pipelines Demo\n');

// Pipeline 1: Fast processing with slow math
const fastPipeline = new Stream()
    .pipe(new Filter(doc => doc.value > 50))                    // Quick filter
    .pipe(new SlowMath('FastPipe', 300))                        // 300ms delay
    .pipe(new Map(doc => ({
        id: doc.id,
        pipeline: 'FAST',
        result: Math.round(doc.computed),
        time: doc.processedAt
    })))
    .collect(result => console.log(`⚡ FAST RESULT:`, result));

// Pipeline 2: Slow processing with database ops
const slowPipeline = new Stream()
    .pipe(new Filter(doc => doc.value < 80))                    // Different filter
    .pipe(new DatabaseOp('SlowPipe', 500))                      // 500ms delay
    .pipe(new SlowMath('SlowPipe', 200))                        // 200ms delay  
    .pipe(new Map(doc => ({
        id: doc.id,
        pipeline: 'SLOW', 
        data: doc.enriched,
        computed: Math.round(doc.computed),
        time: `${doc.lookupTime} -> ${doc.processedAt}`
    })))
    .collect(result => console.log(`🐌 SLOW RESULT:`, result));

async function main() {
    // Generate random data and feed both pipelines
    let counter = 0;
    const interval = setInterval(() => {
        const doc = {
            id: `doc_${++counter}`,
            value: Math.floor(Math.random() * 100),
            timestamp: Date.now()
        };
        
        console.log(`\n📥 Feeding both pipelines: ${doc.id} (value: ${doc.value})`);
        
        // Send to both pipelines simultaneously - they process in parallel!
        fastPipeline.push(doc);
        slowPipeline.push(doc);
        
        if (counter >= 8) {
            clearInterval(interval);
            console.log('\n✅ Finished sending data. Waiting for pipelines to complete...');
        }
    }, 500); // Send new data every 500ms
    
    // Wait for data to be sent
    await new Promise(resolve => {
        const checkInterval = setInterval(() => {
            if (counter >= 8) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
    
    // Wait for both pipelines to finish processing
    await Promise.all([
        fastPipeline.finish(),
        slowPipeline.finish()
    ]);
    
    console.log('\n🏁 Demo complete! Notice how results came out in different orders due to parallel async processing.');
}

main().catch(console.error); 