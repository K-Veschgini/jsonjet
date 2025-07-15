/**
 * Test suite for grammar scalability
 * Tests that the grammar can handle new functions without special parsing rules
 */

import { transpileQuery } from '../src/parser/transpiler/index.js';

console.log("=== Grammar Scalability Tests ===\n");

const testCases = [
    {
        name: "Sum as regular function call",
        query: "numbers | summarize { result: sum(x) }",
        expectSuccess: true,
        description: "sum() should be parsed as regular function call, not special grammar rule"
    },
    {
        name: "Count as regular function call",
        query: "numbers | summarize { result: count() }",
        expectSuccess: true,
        description: "count() should be parsed as regular function call, not special grammar rule"
    },
    {
        name: "Exp as regular function call",
        query: "numbers | summarize { result: exp(x) }",
        expectSuccess: true,
        description: "exp() should be parsed as regular function call"
    },
    {
        name: "Hypothetical new function",
        query: "numbers | summarize { result: hypothetical_function(x) }",
        expectSuccess: true,
        description: "Any identifier followed by parentheses should parse as function call"
    },
    {
        name: "Nested hypothetical functions",
        query: "numbers | summarize { result: outer_func(inner_func(x)) }",
        expectSuccess: true,
        description: "Nested hypothetical functions should parse correctly"
    },
    {
        name: "Mixed real and hypothetical",
        query: "numbers | summarize { result: future_func(sum(exp(x))) }",
        expectSuccess: true,
        description: "Mix of real and hypothetical functions should parse"
    },
    {
        name: "Complex expression with unknowns",
        query: "numbers | summarize { result: add(new_func(x), sum(another_func(y))) }",
        expectSuccess: true,
        description: "Complex expressions with unknown functions should parse"
    }
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);
    console.log(`Query: ${testCase.query}`);
    console.log(`Description: ${testCase.description}`);
    
    try {
        const result = transpileQuery(testCase.query);
        
        if (testCase.expectSuccess) {
            console.log("✅ PASS - Grammar handled unknown function correctly");
            console.log(`Generated: ${result.javascript.substring(0, 100)}...`);
            passed++;
        } else {
            console.log("❌ FAIL - Expected to fail but succeeded");
            failed++;
        }
    } catch (error) {
        if (!testCase.expectSuccess) {
            console.log("✅ PASS - Expected to fail");
            passed++;
        } else {
            console.log("❌ FAIL - Grammar couldn't handle function:", error.message);
            failed++;
        }
    }
}

console.log(`\n=== Test Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
    console.log("🎉 All tests passed! Grammar is scalable.");
} else {
    console.log("⚠️  Some tests failed");
    process.exit(1);
}