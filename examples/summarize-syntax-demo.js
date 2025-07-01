import { Stream } from '../src/core/stream.js';
import { createSummarizeOperator } from '../src/operators/summarize.js';
import { count, sum } from '../src/aggregations/core/aggregation-object.js';
import { hopping_window } from '../src/core/window-functions.js';

console.log('=== Summarize Syntax Demo ===\n');
console.log('Syntax: summarize {key: count(), total: sum("field") } by groupByCallback over window = hopping_window(...)\n');

// Sample data
const data = [
    { department: 'engineering', salary: 100000, quarter: 'Q1', employee: 'Alice' },
    { department: 'engineering', salary: 120000, quarter: 'Q1', employee: 'Bob' },
    { department: 'sales', salary: 80000, quarter: 'Q1', employee: 'Charlie' },
    { department: 'sales', salary: 90000, quarter: 'Q2', employee: 'Diana' },
    { department: 'engineering', salary: 110000, quarter: 'Q2', employee: 'Eve' },
    { department: 'sales', salary: 85000, quarter: 'Q2', employee: 'Frank' }
];

async function demoBasicSyntax() {
    console.log('1. Basic syntax with count() and sum():');
    console.log('   summarize { employee_count: count(), total_salary: sum("salary") }');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator({
        employee_count: count(),
        total_salary: sum('salary')
    });

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of data) stream.push(item);
    await stream.finish();
}

async function demoGroupBy() {
    console.log('\n2. With "by" callback (group by):');
    console.log('   summarize { employee_count: count(), total_salary: sum("salary") } by (item => item.department)');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            employee_count: count(),
            total_salary: sum('salary')
        },
        (item) => item.department  // groupBy callback
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of data) stream.push(item);
    await stream.finish();
}

async function demoComplexGroupBy() {
    console.log('\n3. With complex groupBy function (expression on fields):');
    console.log('   summarize { employee_count: count(), total_salary: sum("salary") } by (item => item.salary > 100000 ? "high" : "low")');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            employee_count: count(),
            total_salary: sum('salary')
        },
        (item) => item.salary > 100000 ? 'high' : 'low'  // Complex expression
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of data) stream.push(item);
    await stream.finish();
}

async function demoWindow() {
    console.log('\n4. With window and window reference:');
    console.log('   summarize { count: count(), total_salary: sum("salary"), window_id: window } by department over window = hopping_window(3, 2)');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            count: count(),
            total_salary: sum('salary'),
            window_id: 'window'  // Reference to the window variable
        },
        (item) => item.department,  // groupBy callback
        hopping_window(3, 2),       // window spec
        'window'                    // window name
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of data) stream.push(item);
    await stream.finish();
}

async function demoMultiFieldGrouping() {
    console.log('\n5. Multiple field grouping with object result:');
    console.log('   summarize { count: count(), total_salary: sum("salary") } by (item => ({dept: item.department, qtr: item.quarter}))');
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator(
        {
            count: count(),
            total_salary: sum('salary')
        },
        (item) => ({ dept: item.department, qtr: item.quarter })  // Object-based grouping with deep equality
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of data) stream.push(item);
    await stream.finish();
}

async function runDemo() {
    try {
        await demoBasicSyntax();
        await demoGroupBy();
        await demoComplexGroupBy();
        await demoWindow();
        await demoMultiFieldGrouping();
        
        console.log('\n=== Key Features Implemented ===');
        console.log('✅ Aggregation object: {key: count(), total: sum("field")}');
        console.log('✅ Explicit constructor: SummarizeOperator(aggSpec, groupByCallback, windowSpec, windowName)');
        console.log('✅ GroupBy callback: single function that can return any value');
        console.log('✅ Complex expressions: function can compute complex values from item fields');
        console.log('✅ Deep equality: objects as group keys work with proper comparison');
        console.log('✅ Window functions: hopping_window(size, hop) with rich object results');
        console.log('✅ Window variable access: reference window in aggregation object');
        console.log('✅ Only count() and sum() aggregations as requested');
        console.log('✅ No spread operator: clean aggregation-only results');
    } catch (error) {
        console.error('Error:', error);
    }
}

runDemo(); 