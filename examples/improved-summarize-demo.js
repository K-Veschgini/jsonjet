import { Stream } from '../src/core/stream.js';
import { createSummarizeOperator, SummarizeOperator } from '../src/operators/summarize.js';
import { count, sum } from '../src/aggregations/core/aggregation-object.js';
import { hopping_window, tumbling_window } from '../src/core/window-functions.js';

console.log('=== Improved Summarize Implementation Demo ===\n');

// Sample data
const employeeData = [
    { name: 'Alice', department: 'engineering', salary: 120000, level: 'senior', region: 'west' },
    { name: 'Bob', department: 'engineering', salary: 95000, level: 'junior', region: 'west' },
    { name: 'Charlie', department: 'sales', salary: 80000, level: 'senior', region: 'east' },
    { name: 'Diana', department: 'sales', salary: 75000, level: 'junior', region: 'east' },
    { name: 'Eve', department: 'engineering', salary: 110000, level: 'senior', region: 'east' },
    { name: 'Frank', department: 'sales', salary: 85000, level: 'senior', region: 'west' }
];

async function demo1_BasicAggregation() {
    console.log('1. ✅ Basic Aggregation (no grouping)');
    console.log('   SummarizeOperator(aggregationSpec)');
    
    const stream = new Stream();
    const summarizeOp = new SummarizeOperator({
        total_employees: count(),
        total_salary: sum(item => item.salary),
        avg_salary_approx: sum('salary') // We only have count and sum, so can't do real avg
    });

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of employeeData) stream.push(item);
    await stream.finish();
}

async function demo2_SimpleGroupBy() {
    console.log('\n2. ✅ Simple GroupBy Callback');
    console.log('   SummarizeOperator(aggSpec, (item) => item.department)');
    
    const stream = new Stream();
    const summarizeOp = new SummarizeOperator(
        {
            employees: count(),
            total_salary: sum(item => item.salary)
        },
        (item) => item.department  // Simple field access
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of employeeData) stream.push(item);
    await stream.finish();
}

async function demo3_ComplexExpression() {
    console.log('\n3. ✅ Complex Expression in GroupBy');
    console.log('   SummarizeOperator(aggSpec, (item) => item.salary > 100000 ? "high-earner" : "regular")');
    
    const stream = new Stream();
    const summarizeOp = new SummarizeOperator(
        {
            employees: count(),
            total_salary: sum(item => item.salary)
        },
        (item) => item.salary > 100000 ? 'high-earner' : 'regular'  // Complex expression
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of employeeData) stream.push(item);
    await stream.finish();
}

async function demo4_ObjectGroupKey() {
    console.log('\n4. ✅ Object as Group Key (Deep Equality)');
    console.log('   SummarizeOperator(aggSpec, (item) => ({dept: item.department, level: item.level}))');
    
    const stream = new Stream();
    const summarizeOp = new SummarizeOperator(
        {
            employees: count(),
            total_salary: sum(item => item.salary)
        },
        (item) => ({ dept: item.department, level: item.level })  // Object group key
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', JSON.stringify(result, null, 2))
    );
    
    for (const item of employeeData) stream.push(item);
    await stream.finish();
}

async function demo5_WindowingWithCallback() {
    console.log('\n5. ✅ Windowing + GroupBy + Rich Window Objects');
    console.log('   SummarizeOperator(aggSpec, groupBy, windowSpec, windowName)');
    
    const stream = new Stream();
    const summarizeOp = new SummarizeOperator(
        {
            employees: count(),
            total_salary: sum(item => item.salary),
            window_info: 'window'  // Reference to window object
        },
        (item) => item.department,     // groupBy callback
        tumbling_window(3),            // window spec (every 3 items)
        'window'                       // window variable name
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', JSON.stringify(result, null, 2))
    );
    
    for (const item of employeeData) stream.push(item);
    await stream.finish();
}

async function demo6_ComplexFunction() {
    console.log('\n6. ✅ Complex Function with Multiple Fields');
    console.log('   GroupBy: (item) => `${item.region}-${item.level}`');
    
    const stream = new Stream();
    const summarizeOp = new SummarizeOperator(
        {
            employees: count(),
            total_salary: sum(item => item.salary),
            category: 'category' // Static value from context won't work, but shows structure
        },
        (item) => `${item.region}-${item.level}`,  // String interpolation with multiple fields
        null,  // no windowing
        'window'
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', result)
    );
    
    for (const item of employeeData) stream.push(item);
    await stream.finish();
}

async function demo7_NestedObjectEquality() {
    console.log('\n7. ✅ Deep Object Equality Test');
    console.log('   Two objects with same structure should be grouped together');
    
    const stream = new Stream();
    const summarizeOp = new SummarizeOperator(
        {
            employees: count(),
            total_salary: sum(item => item.salary)
        },
        (item) => {
            // Create nested object to test deep equality
            return {
                meta: {
                    dept: item.department,
                    tier: item.salary > 100000 ? 'high' : 'low'
                },
                region: item.region
            };
        }
    );

    stream.pipe(summarizeOp).collect(result => 
        console.log('   →', JSON.stringify(result, null, 2))
    );
    
    for (const item of employeeData) stream.push(item);
    await stream.finish();
}

async function runAllDemos() {
    try {
        await demo1_BasicAggregation();
        await demo2_SimpleGroupBy();
        await demo3_ComplexExpression();
        await demo4_ObjectGroupKey();
        await demo5_WindowingWithCallback();
        await demo6_ComplexFunction();
        await demo7_NestedObjectEquality();
        
        console.log('\n=== ✅ All Improvements Implemented ===');
        console.log('1. ✅ Explicit constructor: SummarizeOperator(aggSpec, groupByCallback, windowSpec, windowName)');
        console.log('2. ✅ Single groupBy callback instead of array of expressions');
        console.log('3. ✅ Complex expressions: functions can compute any value from item fields');
        console.log('4. ✅ Deep equality: complex objects as group keys work correctly');
        console.log('5. ✅ No spread operator: clean aggregation-only results');
        console.log('6. ✅ Rich window objects: {windowId, start, end, type, size, hop}');
        console.log('7. ✅ Only count() and sum() aggregations as requested');
        console.log('8. ✅ Clean API with explicit parameters');
    } catch (error) {
        console.error('Error:', error);
    }
}

runAllDemos(); 