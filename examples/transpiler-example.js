import { transpileQuery, createQueryFunction } from '../src/parser/query-transpiler.js';

// Sample data to test queries against
const users = [
    { id: 1, name: "Alice", age: 25, email: "alice@example.com", active: true, department: "Engineering" },
    { id: 2, name: "Bob", age: 30, email: "bob@example.com", active: false, department: "Sales" },
    { id: 3, name: "Charlie", age: 35, email: "charlie@example.com", active: true, department: "Engineering" },
    { id: 4, name: "Diana", age: 22, email: "diana@example.com", active: true, department: "Marketing" },
    { id: 5, name: "Eve", age: 28, email: "eve@example.com", active: false, department: "Sales" }
];

const events = [
    { id: 1, type: "login", user_id: 1, timestamp: 1234567890, message: "User logged in" },
    { id: 2, type: "error", user_id: 2, timestamp: 1234567900, message: "Database connection failed" },
    { id: 3, type: "warning", user_id: 1, timestamp: 1234567910, message: "Slow query detected" },
    { id: 4, type: "login", user_id: 3, timestamp: 1234567920, message: "User logged in" },
    { id: 5, type: "error", user_id: 2, timestamp: 1234567930, message: "API timeout" }
];

// Test queries and their expected transpilations
const testQueries = [
    {
        description: "Simple source reference",
        query: "users",
        expectedJs: "users"
    },
    {
        description: "Filter by age",
        query: "users | where age > 25",
        expectedJs: "users.filter(row => row.age > 25)"
    },
    {
        description: "Filter by string equality",
        query: "events | where type == \"error\"",
        expectedJs: "events.filter(row => row.type === \"error\")"
    },
    {
        description: "Project specific columns",
        query: "users | project name, email",
        expectedJs: "users.map(row => ({ name: row.name, email: row.email }))"
    },
    {
        description: "Combined filter and project",
        query: "users | where age > 25 | project name, department",
        expectedJs: "users.filter(row => row.age > 25).map(row => ({ name: row.name, department: row.department }))"
    },
    {
        description: "Complex boolean condition",
        query: "events | where (type == \"error\" or type == \"warning\") and timestamp > 1234567900",
        expectedJs: "events.filter(row => ((row.type === \"error\") || (row.type === \"warning\")) && (row.timestamp > 1234567900))"
    },
    {
        description: "Boolean literal comparison",
        query: "users | where active == true",
        expectedJs: "users.filter(row => row.active === true)"
    },
    {
        description: "IFF function in WHERE clause",
        query: "users | where iff(age > 25, true, false) == true",
        expectedJs: "users.filter(row => (row.age > 25 ? true : false) === true)"
    },
    {
        description: "IFF with string comparison",
        query: "events | where iff(type == \"error\", \"critical\", \"normal\") == \"critical\"",
        expectedJs: "events.filter(row => (row.type === \"error\" ? \"critical\" : \"normal\") === \"critical\")"
    },
    {
        description: "Simple scan with cumulative counter",
        query: "users | scan (step s1: true => s1.count = iff(s1.count >= 10, 1, s1.count + 1);)",
        expectedJs: "users.pipe(new ScanOperator()\n        .addStep('s1', \n            (state, row) => true,\n            (state, row) => {\n                if (!state.s1) state.s1 = {};\n                state.s1.count = (state.s1.count >= 10 ? 1 : state.s1.count + 1);\n                return null;\n            }\n        ))"
    },
    {
        description: "Scan with condition and arithmetic",
        query: "events | scan (step s1: type == \"error\" => s1.cumulative_x = iff(s1.cumulative_x >= 10, x, x + s1.cumulative_x);)",
        expectedJs: "events.pipe(new ScanOperator()\n        .addStep('s1', \n            (state, row) => row.type === \"error\",\n            (state, row) => {\n                if (!state.s1) state.s1 = {};\n                state.s1.cumulative_x = (state.s1.cumulative_x >= 10 ? row.x : row.x + state.s1.cumulative_x);\n                return null;\n            }\n        ))"
    },
    {
        description: "Scan with multiple statements",
        query: "users | scan (step s1: age > 25 => s1.count = s1.count + 1, s1.total_age = s1.total_age + age;)",
        expectedJs: "users.pipe(new ScanOperator()\n        .addStep('s1', \n            (state, row) => row.age > 25,\n            (state, row) => {\n                if (!state.s1) state.s1 = {};\n                state.s1.count = state.s1.count + 1;\n                state.s1.total_age = state.s1.total_age + row.age;\n                return null;\n            }\n        ))"
    },
    {
        description: "Scan with emit function",
        query: "events | scan (step s1: type == \"error\" => s1.error_count = s1.error_count + 1, emit(s1.error_count);)",
        expectedJs: "events.pipe(new ScanOperator()\n        .addStep('s1', \n            (state, row) => row.type === \"error\",\n            (state, row) => {\n                if (!state.s1) state.s1 = {};\n                state.s1.error_count = state.s1.error_count + 1;\n                return state.s1.error_count;\n            }\n        ))"
    }
];

console.log('Kusto to JavaScript Transpiler Demo');
console.log('='.repeat(50));

// Test transpilation
console.log('\n1. TRANSPILATION TESTS');
console.log('-'.repeat(30));

testQueries.forEach((test, index) => {
    console.log(`\nTest ${index + 1}: ${test.description}`);
    console.log(`Query: ${test.query}`);
    
    try {
        const result = transpileQuery(test.query);
        console.log(`Generated JS: ${result.javascript}`);
        
        // Check if it matches expected (simple string comparison)
        if (result.javascript === test.expectedJs) {
            console.log('✅ Transpilation matches expected output');
        } else {
            console.log('⚠️  Transpilation differs from expected:');
            console.log(`Expected: ${test.expectedJs}`);
        }
    } catch (error) {
        console.log(`❌ Transpilation error: ${error.message}`);
    }
});

// Test execution
console.log('\n\n2. EXECUTION TESTS');
console.log('-'.repeat(30));

const executionTests = [
    {
        description: "Get all active users",
        query: "users | where active == true",
        data: { users }
    },
    {
        description: "Get users over 25 with name and email",
        query: "users | where age > 25 | project name, email",
        data: { users }
    },
    {
        description: "Get error events",
        query: "events | where type == \"error\"",
        data: { events }
    },
    {
        description: "Get recent warnings or errors",
        query: "events | where (type == \"error\" or type == \"warning\") and timestamp > 1234567900",
        data: { events }
    },
    {
        description: "Use IFF to filter users by age condition",
        query: "users | where iff(age > 25, true, false) == true",
        data: { users }
    },
    {
        description: "Use IFF to classify events",
        query: "events | where iff(type == \"error\", true, false) == true",
        data: { events }
    },
    // Note: Scan execution requires the streaming infrastructure from src/core/stream.js
    // and cannot be tested with simple arrays. See examples/scan/ for working examples.
];

executionTests.forEach((test, index) => {
    console.log(`\nExecution Test ${index + 1}: ${test.description}`);
    console.log(`Query: ${test.query}`);
    
    try {
        const queryFunc = createQueryFunction(test.query);
        console.log(`Generated JS: ${queryFunc.javascript}`);
        
        // Execute the query
        const sourceName = queryFunc.javascript.split('.')[0];
        const sourceData = test.data[sourceName];
        
        if (!sourceData) {
            console.log(`❌ Source '${sourceName}' not found in test data`);
            return;
        }
        
        const result = queryFunc.execute(sourceData);
        console.log(`✅ Execution successful! Results (${result.length} rows):`);
        console.log(JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.log(`❌ Execution error: ${error.message}`);
    }
});

console.log('\n' + '='.repeat(50));
console.log('Transpiler demo completed!');

// Interactive example showing the data flow
console.log('\n\n3. DATA FLOW EXAMPLE');
console.log('-'.repeat(30));

const interactiveQuery = "users | where age > 25 | project name, department";
console.log(`Query: ${interactiveQuery}`);

try {
    const transpiled = transpileQuery(interactiveQuery);
    console.log(`\nTranspiled JavaScript: ${transpiled.javascript}`);
    
    const queryFunc = createQueryFunction(interactiveQuery);
    
    console.log('\nOriginal data:');
    console.log(JSON.stringify(users, null, 2));
    
    console.log('\nExecuting query...');
    const result = queryFunc.execute(users);
    
    console.log('\nFinal result:');
    console.log(JSON.stringify(result, null, 2));
    
} catch (error) {
    console.log(`❌ Error: ${error.message}`);
}

// SCAN TRANSPILATION EXAMPLE
console.log('\n\n4. SCAN TRANSPILATION EXAMPLE');
console.log('-'.repeat(30));

const scanQuery = "users | scan (step s1: age > 25 => s1.count = iff(s1.count >= 2, 1, s1.count + 1);)";
console.log(`\nQuery: ${scanQuery}`);

try {
    const scanResult = transpileQuery(scanQuery);
    console.log(`\nGenerated JavaScript:`);
    console.log(scanResult.javascript);
    
    if (scanResult.imports) {
        console.log(`\nRequired imports:`);
        console.log(scanResult.imports);
    }
    
    console.log('\nNote: To execute this, you would need to:');
    console.log('1. Import { Stream } from "./src/core/stream.js"');
    console.log('2. Create a Stream pipeline: new Stream().pipe(...)');
    console.log('3. See examples/scan/ for complete working examples');
    
} catch (error) {
    console.log(`❌ Scan transpilation error: ${error.message}`);
} 