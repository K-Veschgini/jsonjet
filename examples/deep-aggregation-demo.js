import { Stream } from '../src/core/stream.js';
import { createSummarizeOperator } from '../src/operators/summarize.js';
import { count, sum } from '../src/aggregations/core/aggregation-object.js';
import { tumbling_window } from '../src/core/window-functions.js';

console.log('=== Deep Aggregation Processing Demo ===\n');

// Sample data
const salesData = [
    { product: 'laptop', category: 'electronics', amount: 1200, profit: 300, region: 'north' },
    { product: 'mouse', category: 'electronics', amount: 25, profit: 10, region: 'north' },
    { product: 'book', category: 'books', amount: 15, profit: 5, region: 'south' },
    { product: 'keyboard', category: 'electronics', amount: 75, profit: 25, region: 'south' },
    { product: 'monitor', category: 'electronics', amount: 300, profit: 100, region: 'north' },
    { product: 'novel', category: 'books', amount: 20, profit: 8, region: 'south' }
];

async function demo1_NestedObjects() {
    console.log('1. ✅ Nested Object Aggregations');
    console.log('   { summary: { sales: { count: count(), total: sum("amount") }, profit: { total: sum("profit") } }, status: "complete" }');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator({
        summary: {
            sales: {
                count: count(),
                total: sum('amount')
            },
            profit: {
                total: sum('profit')
            }
        },
        status: 'complete',
        timestamp: new Date().toISOString()
    });

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', JSON.stringify(result, null, 2))
    );
    
    for (const item of salesData) stream.push(item);
    await stream.finish();
}

async function demo2_ArrayAggregations() {
    console.log('\n2. ✅ Array of Aggregations');
    console.log('   { metrics: [count(), sum("amount"), sum("profit")] }');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator({
        metrics: [
            count(),
            sum('amount'),
            sum('profit')
        ],
        description: 'Array aggregation test'
    });

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', JSON.stringify(result, null, 2))
    );
    
    for (const item of salesData) stream.push(item);
    await stream.finish();
}

async function demo3_DeeplyNested() {
    console.log('\n3. ✅ Deeply Nested Complex Structure');
    console.log('   Complex nested objects with aggregations at multiple levels');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator({
        report: {
            header: {
                title: 'Sales Report',
                generated_at: new Date().toISOString()
            },
            data: {
                overview: {
                    total_transactions: count(),
                    total_revenue: sum('amount')
                },
                profitability: {
                    total_profit: sum('profit'),
                    metrics: [count(), sum('amount'), sum('profit')]
                }
            },
            summary: [
                { metric: 'count', value: count() },
                { metric: 'revenue', value: sum('amount') },
                { metric: 'profit', value: sum('profit') }
            ]
        },
        meta: {
            processed: true,
            version: '1.0'
        }
    });

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', JSON.stringify(result, null, 2))
    );
    
    for (const item of salesData) stream.push(item);
    await stream.finish();
}

async function demo4_WithGrouping() {
    console.log('\n4. ✅ Deep Aggregations with Grouping');
    console.log('   Nested aggregations grouped by category');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            category_summary: {
                sales: {
                    count: count(),
                    total: sum('amount')
                },
                profit: {
                    total: sum('profit')
                }
            },
            metrics: [count(), sum('amount')]
        },
        (item) => item.category  // Group by category
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', JSON.stringify(result, null, 2))
    );
    
    for (const item of salesData) stream.push(item);
    await stream.finish();
}

async function demo5_WithWindowing() {
    console.log('\n5. ✅ Deep Aggregations with Windowing');
    console.log('   Nested structure with window reference');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            window_info: 'window',
            data: {
                aggregations: {
                    count: count(),
                    total: sum('amount')
                },
                window: 'window'  // Another window reference
            }
        },
        null,                    // no grouping
        tumbling_window(3),      // every 3 items
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
        await demo1_NestedObjects();
        await demo2_ArrayAggregations();
        await demo3_DeeplyNested();
        await demo4_WithGrouping();
        await demo5_WithWindowing();
        
        console.log('\n=== ✅ Deep Aggregation Features ===');
        console.log('1. ✅ Aggregations in nested objects at any depth');
        console.log('2. ✅ Aggregations in arrays');
        console.log('3. ✅ Mixed static values and aggregations');
        console.log('4. ✅ Context references (window) at any depth');
        console.log('5. ✅ Works with grouping and windowing');
        console.log('6. ✅ Complex nested result structures');
        console.log('7. ✅ No lodash dependency - clean recursive implementation');
    } catch (error) {
        console.error('Error:', error);
    }
}

runAllDemos(); 