import { test, expect } from 'bun:test';
import { RdbTestRunner } from './rdb-test-runner.js';

test('RDB Integration Tests', async () => {
    const runner = new RdbTestRunner();
    
    // Suppress all console output during RDB tests to keep test output clean
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    
    try {
        const results = await runner.runAllTests();
        
        // Restore console
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        
        // Report results
        expect(results.total).toBeGreaterThan(0);
        expect(results.failed).toBe(0);
        
        // If any failed, show which ones
        if (results.failed > 0) {
            console.error('Failed RDB tests:', results.details.filter(r => !r.passed).map(r => r.file));
        }
        
    } catch (error) {
        // Restore console even on error
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        throw error;
    }
}, 30000);