import { Stream } from '../src/core/stream.js';
import { createSummarizeOperator } from '../src/operators/summarize.js';
import { count, sum } from '../src/aggregations/core/aggregation-object.js';
import { hopping_window, tumbling_window } from '../src/core/window-functions.js';

console.log('=== Summarize Operator Examples ===\n');

// Sample sales data
const salesData = [
    { id: 1, product: 'laptop', category: 'electronics', amount: 1200, quarter: 'Q1', timestamp: 100 },
    { id: 2, product: 'mouse', category: 'electronics', amount: 25, quarter: 'Q1', timestamp: 110 },
    { id: 3, product: 'book', category: 'books', amount: 15, quarter: 'Q1', timestamp: 120 },
    { id: 4, product: 'keyboard', category: 'electronics', amount: 75, quarter: 'Q2', timestamp: 200 },
    { id: 5, product: 'monitor', category: 'electronics', amount: 300, quarter: 'Q2', timestamp: 210 },
    { id: 6, product: 'novel', category: 'books', amount: 20, quarter: 'Q2', timestamp: 220 }
];

async function example1() {
    console.log('1. Basic aggregation with count and sum');
    console.log('   summarize { total_sales: sum("amount"), item_count: count() }');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator({
        total_sales: sum(item => item.amount),
        item_count: count()
    });

    stream.pipe(summarizeOp).collect(result => 
        console.log('   Result:', result)
    );
    
    for (const sale of salesData) stream.push(sale);
    await stream.finish();
}

async function example2() {
    console.log('\n2. Group by category');
    console.log('   summarize { total_sales: sum("amount"), item_count: count() } by (item => item.category)');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            total_sales: sum(item => item.amount),
            item_count: count()
        },
        (item) => item.category  // groupBy callback
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   Result:', result)
    );
    
    for (const sale of salesData) stream.push(sale);
    await stream.finish();
}

async function example3() {
    console.log('\n3. With static values');
    console.log('   summarize { total_sales: sum("amount"), item_count: count(), type: "summary" } by category');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            total_sales: sum(item => item.amount),
            item_count: count(),
            type: 'summary'  // Static value
        },
        (item) => item.category
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   Result:', result)
    );
    
    for (const sale of salesData) stream.push(sale);
    await stream.finish();
}

async function example4() {
    console.log('\n4. With windowing by timestamp');
    console.log('   summarize { total_sales: sum("amount"), count: count(), window: window } by category over window = tumbling_window(100, "timestamp")');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            total_sales: sum(item => item.amount),
            count: count(),
            window: 'window'  // Reference to window variable
        },
        (item) => item.category,        // groupBy callback
        tumbling_window(100, 'timestamp'), // window spec
        'window'                        // window name
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   Result:', result)
    );
    
    for (const sale of salesData) stream.push(sale);
    await stream.finish();
}

async function example5() {
    console.log('\n5. With tumbling window (count-based - every 3 items)');
    console.log('   summarize { total_sales: sum("amount"), count: count() } over window = tumbling_window(3)');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            total_sales: sum(item => item.amount),
            count: count()
        },
        null,               // no grouping
        tumbling_window(3), // window spec - every 3 items
        'window'
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   Result:', result)
    );
    
    for (const sale of salesData) stream.push(sale);
    await stream.finish();
}

async function example6() {
    console.log('\n6. Complex grouping with multiple fields in callback');
    console.log('   summarize { total_sales: sum("amount"), count: count() } by (item => `${item.category}-${item.quarter}`)');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            total_sales: sum(item => item.amount),
            count: count()
        },
        (item) => `${item.category}-${item.quarter}` // Complex grouping expression
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   Result:', result)
    );
    
    for (const sale of salesData) stream.push(sale);
    await stream.finish();
}

async function runAllExamples() {
    try {
        await example1();
        await example2();
        await example3();
        await example4();
        await example5();
        await example6();
        
        console.log('\n=== Summary of Summarize Features ===');
        console.log('✅ Aggregation object syntax: { key: count(), total: sum("field") }');
        console.log('✅ Explicit constructor: SummarizeOperator(aggSpec, groupByCallback, windowSpec, windowName)');
        console.log('✅ Static values: Include literal values in result');
        console.log('✅ Window references: Access window variable in result object');
        console.log('✅ GroupBy callback: flexible function that can compute any value');
        console.log('✅ Window functions: hopping_window(), tumbling_window()');
        console.log('✅ Aggregation functions: count(), sum(fieldPath)');
        console.log('✅ No spread operator: clean aggregation-only results');
    } catch (error) {
        console.error('Error:', error);
    }
}

runAllExamples(); 