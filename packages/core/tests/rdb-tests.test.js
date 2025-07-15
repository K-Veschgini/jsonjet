import { test, expect } from 'bun:test';
import { RdbTestRunner } from './rdb-test-runner.js';

test('RDB Integration Tests', async () => {
    // Change to the right directory for RDB tests
    const originalCwd = process.cwd();
    process.chdir('/Users/veschgini/Dev/kambis/jsdb/packages/core');
    
    const runner = new RdbTestRunner();
    
    try {
        const results = await runner.runAllTests();
        
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
    } finally {
        // Restore original working directory
        process.chdir(originalCwd);
    }
}, 30000);