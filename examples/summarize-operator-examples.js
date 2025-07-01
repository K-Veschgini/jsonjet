import { Stream } from '../src/core/stream.js';
import { SummarizeOperator } from '../src/operators/summarize.js';

console.log('=== SummarizeOperator Examples ===\n');

// Sample data
const employees = [
    { name: 'Alice', department: 'Engineering', salary: 100, quarter: 'Q1' },
    { name: 'Bob', department: 'Engineering', salary: 120, quarter: 'Q1' },
    { name: 'Charlie', department: 'Sales', salary: 80, quarter: 'Q1' },
    { name: 'Diana', department: 'Sales', salary: 90, quarter: 'Q2' },
    { name: 'Eve', department: 'Engineering', salary: 110, quarter: 'Q2' }
];

async function example1() {
    console.log('1. Simple Count (no windowing, no grouping)');
    console.log('   Count all employees');
    
    const stream = new Stream();
    const countOp = new SummarizeOperator({
        onWindowOpen: () => ({ count: 0 }),
        onItem: (item, state) => { state.count++; },
        onWindowClose: (state) => ({ totalEmployees: state.count })
    });

    stream.pipe(countOp).collect(result => console.log('   Result:', result));
    
    for (const emp of employees) stream.push(emp);
    await stream.finish();
}

async function example2() {
    console.log('\n2. Count by Department (grouping only)');
    console.log('   Count employees grouped by department');
    
    const stream = new Stream();
    const countByDeptOp = new SummarizeOperator({
        onWindowOpen: () => ({ count: 0 }),
        onItem: (item, state) => { state.count++; },
        onWindowClose: (state) => ({ employees: state.count }),
        groupFunc: (item) => item.department
    });

    let groupIndex = 0;
    const groupNames = ['Engineering', 'Sales']; // We know the departments in our data
    stream.pipe(countByDeptOp).collect(result => 
        console.log(`   ${groupNames[groupIndex++ % groupNames.length]}: ${result.employees} employees`)
    );
    
    for (const emp of employees) stream.push(emp);
    await stream.finish();
}

async function example3() {
    console.log('\n3. Count by Quarter (windowing only)');
    console.log('   Count employees per quarter window');
    
    const stream = new Stream();
    const countByQuarterOp = new SummarizeOperator({
        onWindowOpen: () => ({ count: 0 }),
        onItem: (item, state) => { state.count++; },
        onWindowClose: (state) => ({ employees: state.count }),
        windowFunc: (item) => item.quarter
    });

    stream.pipe(countByQuarterOp).collect(result => 
        console.log('   Quarter result:', result)
    );
    
    for (const emp of employees) stream.push(emp);
    await stream.finish();
}

async function example4() {
    console.log('\n4. Count by Department per Quarter (windowing + grouping)');
    console.log('   Count employees by department within each quarter');
    
    const stream = new Stream();
    const countByDeptPerQuarterOp = new SummarizeOperator({
        onWindowOpen: () => ({ count: 0 }),
        onItem: (item, state) => { state.count++; },
        onWindowClose: (state) => ({ employees: state.count }),
        windowFunc: (item) => item.quarter,
        groupFunc: (item) => item.department
    });

    let windowGroupIndex = 0;
    const windowGroupNames = ['Engineering', 'Sales']; // Groups within windows
    stream.pipe(countByDeptPerQuarterOp).collect(result => 
        console.log(`   ${windowGroupNames[windowGroupIndex++ % windowGroupNames.length]} in window: ${result.employees} employees`)
    );
    
    for (const emp of employees) stream.push(emp);
    await stream.finish();
}

async function example5() {
    console.log('\n5. Advanced: Average Salary by Department');
    console.log('   Calculate average salary per department');
    
    const stream = new Stream();
    const avgSalaryOp = new SummarizeOperator({
        onWindowOpen: () => ({ totalSalary: 0, count: 0 }),
        onItem: (item, state) => { 
            state.totalSalary += item.salary; 
            state.count++;
        },
        onWindowClose: (state) => ({ 
            averageSalary: Math.round(state.totalSalary / state.count) 
        }),
        groupFunc: (item) => item.department
    });

    let salaryGroupIndex = 0;
    const salaryGroupNames = ['Engineering', 'Sales'];
    stream.pipe(avgSalaryOp).collect(result => 
        console.log(`   ${salaryGroupNames[salaryGroupIndex++ % salaryGroupNames.length]}: $${result.averageSalary} average salary`)
    );
    
    for (const emp of employees) stream.push(emp);
    await stream.finish();
}

async function runAllExamples() {
    try {
        await example1();
        await example2();
        await example3();
        await example4();
        await example5();
        
        console.log('\n=== Key Features ===');
        console.log('✅ Windowing: Groups data by window function, closes/opens windows on changes');
        console.log('✅ Grouping: Groups data within windows by group function');
        console.log('✅ Flexible callbacks: Custom logic for window open, item processing, window close');
        console.log('✅ Flush support: Automatically handles final window when stream ends');
        console.log('✅ Composable: Works with any stream pipeline\n');
    } catch (error) {
        console.error('Error:', error);
    }
}

runAllExamples(); 