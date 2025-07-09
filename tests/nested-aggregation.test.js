/**
 * Test suite for nested aggregation functionality
 * Tests the ability to use scalar functions inside aggregation functions and vice versa
 */

import { transpileQuery } from '../src/parser/transpiler/index.js';

console.log("=== Nested Aggregation Tests ===\n");

const testCases = [
    {
        name: "Basic scalar function",
        query: "numbers | summarize { result: exp(x) }",
        expectSuccess: true,
        description: "Simple scalar function should work"
    },
    {
        name: "Basic aggregation function", 
        query: "numbers | summarize { result: sum(x) }",
        expectSuccess: true,
        description: "Simple aggregation function should work"
    },
    {
        name: "Scalar inside aggregation",
        query: "numbers | summarize { result: sum(exp(x)) }",
        expectSuccess: true,
        description: "Scalar function inside aggregation should work"
    },
    {
        name: "Aggregation inside scalar",
        query: "numbers | summarize { result: exp(sum(x)) }",
        expectSuccess: true,
        description: "Aggregation function inside scalar should work"
    },
    {
        name: "Complex nested expression",
        query: "numbers | summarize { result: exp(sum(exp(x))) }",
        expectSuccess: true,
        description: "Deep nesting should work: exp(sum(exp(x)))"
    },
    {
        name: "Multiple nested expressions",
        query: "numbers | summarize { a: sum(exp(x)), b: exp(sum(x)), c: exp(sum(exp(x))) }",
        expectSuccess: true,
        description: "Multiple different nested expressions should work"
    },
    {
        name: "Count function nesting",
        query: "numbers | summarize { result: exp(count()) }",
        expectSuccess: true,
        description: "Count function inside scalar should work"
    },
    {
        name: "Arithmetic with nested functions",
        query: "numbers | summarize { result: add(sum(x), exp(sum(y))) }",
        expectSuccess: true,
        description: "Arithmetic operations with nested functions should work"
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
            console.log("✅ PASS");
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
            console.log("❌ FAIL - Unexpected error:", error.message);
            failed++;
        }
    }
}

console.log(`\n=== Test Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
    console.log("🎉 All tests passed!");
} else {
    console.log("⚠️  Some tests failed");
    process.exit(1);
}