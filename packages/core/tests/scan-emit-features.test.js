import { describe, it, expect, beforeEach } from 'bun:test';
import { createInstances } from '../src/instances.js';

describe('Scan Emit Features', () => {
    let streamManager;
    let queryEngine;
    
    beforeEach(async () => {
        const instances = createInstances();
        streamManager = instances.streamManager;
        queryEngine = instances.queryEngine;
        
        await queryEngine.executeStatement("create stream input;");
        await queryEngine.executeStatement("create stream output;");
    });

    const testEmitFeature = async (testCase) => {
        const results = [];
        streamManager.subscribeToStream('output', (data) => {
            results.push(data.data);
        });
        
        // Create flow
        await queryEngine.executeStatement(testCase.query);
        
        // Insert data
        await queryEngine.executeStatement(`insert into input ${JSON.stringify(testCase.input)};`);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Check result
        const actual = results[results.length - 1];
        return actual;
    };

    it('should handle spread all (...*)', async () => {
        const testCase = {
            query: `create flow test1 as\ninput | scan(step s1: true => emit({ ...*, extra: "added" });) | insert_into(output);`,
            input: { x: 1, name: "test" },
            expected: { x: 1, name: "test", extra: "added" }
        };
        
        const actual = await testEmitFeature(testCase);
        expect(actual).toEqual(testCase.expected);
    });

    it('should handle spread expression (...s1)', async () => {
        const testCase = {
            query: `create flow test2 as\ninput | scan(step s1: true => s1.count = (s1.count || 0) + 1, emit({ ...s1, input: x });) | insert_into(output);`,
            input: { x: 5 },
            expected: { count: 1, input: 5 }
        };
        
        const actual = await testEmitFeature(testCase);
        expect(actual).toEqual(testCase.expected);
    });

    it('should handle field deletion (-name)', async () => {
        const testCase = {
            query: `create flow test3 as\ninput | scan(step s1: true => emit({ ...*, -name });) | insert_into(output);`,
            input: { x: 1, name: "test", value: 42 },
            expected: { x: 1, value: 42 }
        };
        
        const actual = await testEmitFeature(testCase);
        expect(actual).toEqual(testCase.expected);
    });

    it('should handle scalar functions', async () => {
        const testCase = {
            query: `create flow test4 as\ninput | scan(step s1: true => emit({ result: abs(x), input: x });) | insert_into(output);`,
            input: { x: -10 },
            expected: { result: 10, input: -10 }
        };
        
        const actual = await testEmitFeature(testCase);
        expect(actual).toEqual(testCase.expected);
    });

    it('should handle shorthand properties', async () => {
        const testCase = {
            query: `create flow test5 as\ninput | scan(step s1: true => s1.total = (s1.total || 0) + x, emit({ x, total: s1.total });) | insert_into(output);`,
            input: { x: 7 },
            expected: { x: 7, total: 7 }
        };
        
        const actual = await testEmitFeature(testCase);
        expect(actual).toEqual(testCase.expected);
    });

    it('should handle complex emit scenarios', async () => {
        const testCase = {
            query: `create flow complex as\ninput | scan(step s1: true => 
                s1.count = (s1.count || 0) + 1,
                s1.sum = (s1.sum || 0) + x,
                emit({ 
                    ...s1, 
                    average: s1.sum / s1.count,
                    input: x,
                    processed: true 
                });
            ) | insert_into(output);`,
            input: { x: 10 },
            expected: { count: 1, sum: 10, average: 10, input: 10, processed: true }
        };
        
        const actual = await testEmitFeature(testCase);
        expect(actual).toEqual(testCase.expected);
    });
});