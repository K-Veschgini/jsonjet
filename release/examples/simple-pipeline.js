import { Stream } from '../lib/src/core/stream.js';
import { ScanOperator } from '../lib/src/operators/scan.js';
import { Filter } from '../lib/src/operators/filter.js';
import { Map } from '../lib/src/operators/map.js';

const scanOp = new ScanOperator()
    .addStep('login', (state, doc) => doc.event === 'login')
    .addStep('purchase', (state, doc) => doc.event === 'purchase', 
        (state, doc) => ({ 
            userId: state.login.userId, 
            sessionId: state.matchId,
            purchaseAmount: doc.amount 
        }));

async function main() {
    const pipeline = new Stream()
        .pipe(scanOp)
        .pipe(new Filter(doc => doc.purchaseAmount > 50))
        .pipe(new Map(doc => ({ ...doc, processed: true })))
        .collect(result => console.log('Output:', result));

    pipeline.push({ event: 'login', userId: 'user1', timestamp: 100 });
    pipeline.push({ event: 'purchase', userId: 'user1', amount: 75, timestamp: 200 });
    pipeline.push({ event: 'purchase', userId: 'user1', amount: 25, timestamp: 300 });
    
    // Wait for all processing to complete
    await pipeline.finish();
    console.log('✅ All processing complete!');
}

main().catch(console.error); 