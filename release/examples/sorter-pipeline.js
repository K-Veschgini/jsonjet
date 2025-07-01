import { Stream, Sorter, Filter, Map } from '../lib/src/index.js';

async function main() {
    console.log('Sorter pipeline example\n');

    // Create a pipeline that sorts by timestamp, filters, and transforms
    const pipeline = new Stream()
        .pipe(new Sorter(doc => doc.timestamp, 3, 1000))  // Sort by timestamp, buffer 3, 1sec max
        .pipe(new Filter(doc => doc.value > 200))         // Only values > 200
        .pipe(new Map(doc => ({ ...doc, processed: true }))) // Add processed flag
        .collect(result => console.log('Final output:', result));

    // Send out-of-order time series data
    const events = [
        { timestamp: 100, value: 150, id: 'low' },
        { timestamp: 300, value: 350, id: 'high1' },
        { timestamp: 200, value: 250, id: 'high2' },  // Out of order
        { timestamp: 400, value: 450, id: 'high3' },
        { timestamp: 150, value: 175, id: 'late' },   // Too late
    ];

    // Send events with delays
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        await new Promise(resolve => setTimeout(resolve, i * 300));
        console.log(`Pushing: ${event.id} (ts: ${event.timestamp}, val: ${event.value})`);
        pipeline.push(event);
    }
    
    // Wait for all processing to complete
    await pipeline.finish();
    console.log('✅ All processing complete!');
}

main().catch(console.error); 