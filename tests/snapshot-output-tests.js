import { StreamManager } from '../src/core/stream-manager.js';
import { QueryEngine } from '../src/core/query-engine.js';

// =============================================================================
// SNAPSHOT OUTPUT TESTING SYSTEM
// =============================================================================
// This creates deterministic snapshots of exact outputs for regression testing

class OutputSnapshotTester {
    constructor() {
        this.snapshots = new Map();
        this.failures = [];
    }

    async captureSnapshot(name, query, inputData, expectedOutputCount = null) {
        const streamManager = new StreamManager();
        const queryEngine = new QueryEngine(streamManager);
        
        try {
            // Setup streams
            streamManager.createStream('input');
            streamManager.createStream('output');
            
            // Create flow
            const flowResult = await queryEngine.executeStatement(
                `create flow ${name} from input ${query} | insert_into(output)`
            );
            
            if (!flowResult.success) {
                throw new Error(`Flow creation failed: ${flowResult.message}`);
            }
            
            // Collect outputs
            const outputs = [];
            const subscriptionId = streamManager.subscribeToStream('output', (message) => {
                outputs.push(JSON.parse(JSON.stringify(message.data))); // Deep clone
            });
            
            // Insert input data
            for (const data of inputData) {
                await streamManager.insertIntoStream('input', data);
            }
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 100));
            
            streamManager.unsubscribeFromStream(subscriptionId);
            
            // Sort outputs for deterministic comparison
            outputs.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
            
            // Validate expected count if provided
            if (expectedOutputCount !== null && outputs.length !== expectedOutputCount) {
                throw new Error(`Expected ${expectedOutputCount} outputs, got ${outputs.length}`);
            }
            
            const snapshot = {
                name,
                query,
                inputData: JSON.parse(JSON.stringify(inputData)),
                outputs: outputs,
                metadata: {
                    timestamp: new Date().toISOString(),
                    inputCount: inputData.length,
                    outputCount: outputs.length
                }
            };
            
            this.snapshots.set(name, snapshot);
            return snapshot;
            
        } catch (error) {
            this.failures.push({ name, error: error.message, query });
            throw error;
        }
    }

    compareSnapshot(name, expectedSnapshot) {
        const actualSnapshot = this.snapshots.get(name);
        if (!actualSnapshot) {
            throw new Error(`No snapshot found for '${name}'`);
        }
        
        const differences = [];
        
        // Compare output count
        if (actualSnapshot.outputs.length !== expectedSnapshot.outputs.length) {
            differences.push(`Output count: expected ${expectedSnapshot.outputs.length}, got ${actualSnapshot.outputs.length}`);
        }
        
        // Compare each output
        for (let i = 0; i < Math.max(actualSnapshot.outputs.length, expectedSnapshot.outputs.length); i++) {
            const actual = actualSnapshot.outputs[i];
            const expected = expectedSnapshot.outputs[i];
            
            if (!actual && expected) {
                differences.push(`Missing output at index ${i}: ${JSON.stringify(expected)}`);
            } else if (actual && !expected) {
                differences.push(`Extra output at index ${i}: ${JSON.stringify(actual)}`);
            } else if (actual && expected) {
                const actualStr = JSON.stringify(actual);
                const expectedStr = JSON.stringify(expected);
                if (actualStr !== expectedStr) {
                    differences.push(`Output ${i} differs:\n  Expected: ${expectedStr}\n  Actual: ${actualStr}`);
                }
            }
        }
        
        return {
            passed: differences.length === 0,
            differences,
            actualSnapshot,
            expectedSnapshot
        };
    }

    generateReport() {
        const report = {
            totalSnapshots: this.snapshots.size,
            failures: this.failures.length,
            snapshots: Array.from(this.snapshots.values()),
            failureDetails: this.failures
        };
        
        return report;
    }
}

// =============================================================================
// COMPREHENSIVE OUTPUT SNAPSHOTS
// =============================================================================

export async function runSnapshotTests() {
    console.log('📸 RUNNING SNAPSHOT OUTPUT TESTS\n');
    
    const tester = new OutputSnapshotTester();
    
    // Define expected snapshots (golden master)
    const expectedSnapshots = {
        basic_where: {
            outputs: [
                { name: 'Alice', age: 25 },
                { name: 'Carol', age: 30 }
            ]
        },
        
        select_fields: {
            outputs: [
                { name: 'John', age: 30, email: 'john@test.com' }
            ]
        },
        
        logical_operators: {
            outputs: [
                { name: 'Test1', safe_value: 'default', both_flags: true },
                { name: 'Test2', safe_value: 'actual', both_flags: false }
            ]
        },
        
        project_computation: {
            outputs: [
                { product: 'Widget', quantity: 10, price: 5.99, total: 59.9 }
            ]
        },
        
        multi_stage: {
            outputs: [
                { order_id: 1, customer: 'Alice', final_amount: 103.0 },
                { order_id: 2, customer: 'Bob', final_amount: 206.0 }
            ]
        }
    };
    
    const testCases = [
        {
            name: 'basic_where',
            query: '| where age >= 25',
            input: [
                { name: 'Alice', age: 25 },
                { name: 'Bob', age: 20 },
                { name: 'Carol', age: 30 }
            ],
            expectedCount: 2
        },
        
        {
            name: 'select_fields',
            query: '| select { name: name, age: age, email: email }',
            input: [
                { name: 'John', age: 30, email: 'john@test.com', password: 'secret', ssn: '123-45-6789' }
            ],
            expectedCount: 1
        },
        
        {
            name: 'logical_operators',
            query: '| select { name: name, safe_value: value || "default", both_flags: flag1 && flag2 }',
            input: [
                { name: 'Test1', value: null, flag1: true, flag2: true },
                { name: 'Test2', value: 'actual', flag1: false, flag2: true }
            ],
            expectedCount: 2
        },
        
        {
            name: 'project_computation',
            query: '| project { product: product, quantity: quantity, price: price, total: quantity * price }',
            input: [
                { product: 'Widget', quantity: 10, price: 5.99 }
            ],
            expectedCount: 1
        },
        
        {
            name: 'multi_stage',
            query: '| where amount >= 100 | select { order_id: order_id, customer: customer } | project { order_id: order_id, customer: customer, final_amount: order_id * 103.0 }',
            input: [
                { order_id: 1, customer: 'Alice', amount: 150 },
                { order_id: 2, customer: 'Bob', amount: 200 },
                { order_id: 3, customer: 'Carol', amount: 50 }  // Should be filtered
            ],
            expectedCount: 2
        }
    ];
    
    // Capture snapshots
    console.log('Capturing snapshots...');
    for (const testCase of testCases) {
        try {
            console.log(`  📷 ${testCase.name}...`);
            await tester.captureSnapshot(testCase.name, testCase.query, testCase.input, testCase.expectedCount);
            console.log(`    ✅ Captured ${testCase.name}`);
        } catch (error) {
            console.log(`    ❌ Failed ${testCase.name}: ${error.message}`);
        }
    }
    
    // Compare against expected snapshots
    console.log('\nComparing snapshots...');
    let totalTests = 0;
    let passedTests = 0;
    
    for (const [name, expected] of Object.entries(expectedSnapshots)) {
        totalTests++;
        try {
            const comparison = tester.compareSnapshot(name, expected);
            if (comparison.passed) {
                console.log(`  ✅ ${name}: PASSED`);
                passedTests++;
            } else {
                console.log(`  ❌ ${name}: FAILED`);
                comparison.differences.forEach(diff => {
                    console.log(`    - ${diff}`);
                });
            }
        } catch (error) {
            console.log(`  💥 ${name}: ERROR - ${error.message}`);
        }
    }
    
    // Generate detailed report
    const report = tester.generateReport();
    
    console.log('\n=== SNAPSHOT TEST RESULTS ===');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    console.log(`📊 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (report.failures.length > 0) {
        console.log('\n🚨 FAILURES:');
        report.failures.forEach(failure => {
            console.log(`  - ${failure.name}: ${failure.error}`);
        });
    }
    
    console.log('\n📋 DETAILED SNAPSHOTS:');
    report.snapshots.forEach(snapshot => {
        console.log(`\n${snapshot.name}:`);
        console.log(`  Query: ${snapshot.query}`);
        console.log(`  Input: ${snapshot.inputData.length} records`);
        console.log(`  Output: ${snapshot.outputs.length} records`);
        snapshot.outputs.forEach((output, i) => {
            console.log(`    ${i + 1}: ${JSON.stringify(output)}`);
        });
    });
    
    return report;
}

// Run if called directly
if (import.meta.main) {
    runSnapshotTests().catch(console.error);
}