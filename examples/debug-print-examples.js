import { transpileQuery } from '../src/parser/query-transpiler.js';

console.log('=== Command System Examples ===\n');
console.log('Commands start with . and are separate from the main query language\n');

// The .print command allows you to debug expressions without needing full pipelines
console.log('1. Basic literals:');
[
    '.print "hello world"',
    '.print 42',
    '.print true'
].forEach(query => {
    const result = transpileQuery(query);
    console.log(`  ${query} => ${result.javascript}`);
    eval(result.javascript);
});

console.log('\n2. Object literals:');
[
    '.print {name: "John", age: 30}',
    '.print {step: "cumSum", active: true}',  // Keywords as property names
    '.print {"full-name": "Jane Doe", id: 123}'  // String keys
].forEach(query => {
    const result = transpileQuery(query);
    console.log(`  ${query}`);
    console.log(`    => ${result.javascript}`);
    eval(result.javascript);
});

console.log('\n3. Complex objects with spread syntax:');
[
    '.print {name: "John", age: 30, ...{extra: "data"}}',
    '.print {id: 123, status: "active", "created-at": "2024-01-01"}'
].forEach(query => {
    const result = transpileQuery(query);
    console.log(`  ${query}`);
    console.log(`    => ${result.javascript}`);
    eval(result.javascript);
});

console.log('\n4. Step variables (for scan debugging):');
[
    '.print cumSum.cumulative_x',  // state.cumSum.cumulative_x
    '.print s1.timestamp',         // state.s1.timestamp  
    '.print row.x',                // row.x (explicit)
    '.print x'                     // row.x (implicit)
].forEach(query => {
    const result = transpileQuery(query);
    console.log(`  ${query} => ${result.javascript}`);
});

console.log('\n5. Complex scan emit objects:');
[
    '.print {input: x, cumulative: cumSum.cumulative_x, step: "cumSum"}',
    '.print {timestamp: s1.timestamp, event: s1.event, sessionStart: sessionTracker.sessionStart, sessionDuration: s1.timestamp - sessionTracker.sessionStart, status: "ongoing"}'
].forEach(query => {
    const result = transpileQuery(query);
    console.log(`  Object structure: ${query.split('.print ')[1]}`);
    console.log(`    => ${result.javascript}`);
});

console.log('\n=== Command System Notes ===');
console.log('- Commands start with . and are separate from query pipelines');
console.log('- Current commands: .print (more coming: .help, .describe, .schema)');
console.log('- Use .print to debug any expression without needing data sources');
console.log('- Perfect for testing object literals before using in emit() functions');
console.log('- Keywords like "step", "scan", "where" can be used as property names');
console.log('- Supports all object literal features: shorthand, spread, string keys');
console.log('- Variables with dots (like cumSum.x) are treated as state variables');
console.log('- Simple variables (like x) are treated as row variables\n'); 