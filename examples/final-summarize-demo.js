import { Stream } from '../src/core/stream.js';
import { createSummarizeOperator } from '../src/operators/summarize.js';
import { count, sum } from '../src/aggregations/core/aggregation-object.js';
import { hopping_window, tumbling_window } from '../src/core/window-functions.js';

console.log('=== Final Summarize Implementation Demo ===\n');

// Sample data
const salesData = [
    { product: 'laptop', category: 'electronics', amount: 1200, region: 'north', timestamp: 100 },
    { product: 'mouse', category: 'electronics', amount: 25, region: 'north', timestamp: 110 },
    { product: 'book', category: 'books', amount: 15, region: 'south', timestamp: 120 },
    { product: 'keyboard', category: 'electronics', amount: 75, region: 'south', timestamp: 200 },
    { product: 'monitor', category: 'electronics', amount: 300, region: 'north', timestamp: 210 },
    { product: 'novel', category: 'books', amount: 20, region: 'south', timestamp: 220 }
];

async function demo1() {
    console.log('1. ✅ Aggregation Functions: count() and sum()');
    console.log('   summarize { sales_count: count(), total_revenue: sum("amount") }');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator({ 
        sales_count: count(), 
        total_revenue: sum(item => item.amount) 
    });

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of salesData) stream.push(item);
    await stream.finish();
}

async function demo2() {
    console.log('\n2. ✅ GroupBy Callback with Simple Field Access');
    console.log('   summarize { count: count(), total: sum("amount") } by (item => item.category)');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        { 
            count: count(), 
            total: sum(item => item.amount)
        },
        (item) => item.category  // Simple field access
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of salesData) stream.push(item);
    await stream.finish();
}

async function demo3() {
    console.log('\n3. ✅ Complex GroupBy Expression');
    console.log('   summarize { count: count(), total: sum("amount") } by (item => `${item.category}-${item.region}`)');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        { 
            count: count(), 
            total: sum(item => item.amount)
        },
        (item) => `${item.category}-${item.region}`  // Complex expression
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of salesData) stream.push(item);
    await stream.finish();
}

async function demo4() {
    console.log('\n4. ✅ Window Functions with Rich Information (start, end, type)');
    console.log('   summarize { count: count(), total: sum("amount"), window_info: window } over window = hopping_window(3, 2)');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        { 
            count: count(), 
            total: sum(item => item.amount),
            window_info: 'window'  // Access the rich window object
        },
        null,                   // no grouping
        hopping_window(3, 2),   // window spec
        'window'                // window name
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', JSON.stringify(result, null, 2))
    );
    
    for (const item of salesData) stream.push(item);
    await stream.finish();
}

async function demo5() {
    console.log('\n5. ✅ Time-based Windows with Rich Information');
    console.log('   summarize { count: count(), total: sum("amount"), window_info: window } over window = tumbling_window(100, "timestamp")');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        { 
            count: count(), 
            total: sum(item => item.amount),
            window_info: 'window'
        },
        null,                              // no grouping
        tumbling_window(100, 'timestamp'), // time-based window
        'window'
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', JSON.stringify(result, null, 2))
    );
    
    for (const item of salesData) stream.push(item);
    await stream.finish();
}

async function demo6() {
    console.log('\n6. ✅ Object-based GroupBy with Deep Equality');
    console.log('   summarize { count: count(), total: sum("amount") } by (item => ({cat: item.category, reg: item.region}))');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        { 
            count: count(), 
            total: sum(item => item.amount),
            type: 'sales_summary'  // Static value
        },
        (item) => ({ cat: item.category, reg: item.region }), // Object-based grouping
        null,
        'window'
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', JSON.stringify(result, null, 2))
    );
    
    for (const item of salesData) stream.push(item);
    await stream.finish();
}

async function runAllDemos() {
    try {
        await demo1();
        await demo2();
        await demo3();
        await demo4();
        await demo5();
        await demo6();
        
        console.log('\n=== ✅ Implementation Summary ===');
        console.log('1. ✅ Window functions return rich objects with {windowId, start, end, type, ...}');
        console.log('2. ✅ Aggregations moved to proper folder structure: src/aggregations/{core,functions}/');
        console.log('3. ✅ Single SummarizeOperator (consolidated implementation)');
        console.log('4. ✅ GroupBy callback: single function that can return any value');
        console.log('5. ✅ Complex expressions: functions can compute complex values from item fields');
        console.log('6. ✅ Deep equality: objects as group keys work with proper comparison');
        console.log('7. ✅ No spread operator: clean aggregation-only results');
        console.log('8. ✅ Only count() and sum() aggregations as requested');
        console.log('9. ✅ Explicit constructor: SummarizeOperator(aggSpec, groupByCallback, windowSpec, windowName)');
    } catch (error) {
        console.error('Error:', error);
    }
}

runAllDemos(); 