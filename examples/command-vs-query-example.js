import { transpileQuery } from '../src/parser/query-transpiler.js';

console.log('=== Commands vs Queries ===\n');

console.log('1. COMMANDS (start with .) - standalone operations:');
const commands = [
    '.print "hello"',
    '.print {name: "John", age: 30}',
    '.print cumSum.total'
    // Future: .help, .describe users, .schema, .explain query
];

commands.forEach(cmd => {
    console.log(`  ${cmd}`);
    const result = transpileQuery(cmd);
    console.log(`    => ${result.javascript}\n`);
});

console.log('2. QUERIES (data pipelines) - process data streams:');
const queries = [
    'users | where age > 25 | collect()',
    'data | scan step s1: x > 0 => emit(x); | collect()',
    'events | project name, timestamp | collect()'
];

queries.forEach(query => {
    console.log(`  ${query}`);
    try {
        const result = transpileQuery(query);
        console.log(`    => ${result.javascript.substring(0, 80)}...\n`);
    } catch (error) {
        console.log(`    => Error: ${error.message}\n`);
    }
});

console.log('=== Design Philosophy ===');
console.log('Commands: .verb [arguments] - immediate operations');
console.log('Queries:  source | operation | operation... - data pipelines');
console.log('');
console.log('This separation allows:');
console.log('- Commands for debugging, help, introspection');
console.log('- Queries for data processing and analysis');
console.log('- Clean syntax distinction');
console.log('- Future extensibility\n'); 