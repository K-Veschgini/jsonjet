import { test, expect } from 'bun:test';
import { JetTestRunner } from './jet-test-runner.js';

test('JET Integration Tests', async () => {
    // Store original console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    // Change to the right directory for RDB tests
    const originalCwd = process.cwd();
    process.chdir('/Users/veschgini/Dev/kambis/jsdb/packages/core');
    
    const runner = new JetTestRunner();
    
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
        // Log the error before restoring console
        console.error('RDB Integration Tests failed with error:', error);
        throw error;
    } finally {
        // Restore original console methods
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        
        // Restore original working directory
        process.chdir(originalCwd);
    }
}, 30000);