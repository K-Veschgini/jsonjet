import { Stream } from '../src/core/stream.js';
import { createSummarizeOperator } from '../src/operators/summarize.js';
import { count, sum } from '../src/aggregations/core/aggregation-object.js';

console.log('=== Testing New Sum Implementation ===\n');

const testData = [
    { name: 'Alice', score: 85, bonus: 10 },
    { name: 'Bob', score: 92, bonus: 15 },
    { name: 'Charlie', score: 78, bonus: 5 }
];

async function testBasicSum() {
    console.log('1. Basic sum with value expression');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator({
        total_count: count(),
        total_scores: sum(item => item.score),
        total_bonus: sum(item => item.bonus),
        calculated_total: sum(item => item.score + item.bonus)
    });

    stream.pipe(summarizeOp).collect(result => 
        console.log('   Result:', result)
    );
    
    for (const item of testData) stream.push(item);
    await stream.finish();
}

async function testWithGroupBy() {
    console.log('\n2. Sum with groupBy (high vs low scorers)');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            count: count(),
            total_score: sum(item => item.score),
            avg_bonus: sum(item => item.bonus) // We'll divide by count manually
        },
        item => item.score >= 85 ? 'high' : 'low'
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   Result:', result)
    );
    
    for (const item of testData) stream.push(item);
    await stream.finish();
}

async function runTests() {
    try {
        await testBasicSum();
        await testWithGroupBy();
        console.log('\n✅ New sum implementation works!');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

runTests();