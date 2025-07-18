import { test, expect } from 'bun:test';
import { config } from '../src/functions/index.js';
import { Registry } from '../src/core/registry.js';
import { registerServerFunctions } from '../src/functions/server-index.js';

// Create test registry
const functionRegistry = new Registry();
registerServerFunctions(functionRegistry);

test('Scalar Functions > exp function > should be registered', () => {
    expect(functionRegistry.hasFunction('exp')).toBe(true);
});

test('Scalar Functions > exp function > should calculate e^x correctly', () => {
    const result = functionRegistry.executeFunction('exp', [1]);
    expect(result).toBeCloseTo(Math.E, 10);
});

test('Scalar Functions > exp function > should return null for non-numbers', () => {
    expect(functionRegistry.executeFunction('exp', ['abc'])).toBeNull();
    expect(functionRegistry.executeFunction('exp', [true])).toBeNull();
    expect(functionRegistry.executeFunction('exp', [null])).toBeNull();
    expect(functionRegistry.executeFunction('exp', [undefined])).toBeNull();
});

test('Scalar Functions > exp function > should return null for wrong argument count', () => {
    expect(functionRegistry.executeFunction('exp', [])).toBeNull();
    expect(functionRegistry.executeFunction('exp', [1, 2])).toBeNull();
});

test('Scalar Functions > config > should control warning logging', () => {
    const originalConsoleWarn = console.warn;
    const warnings = [];
    console.warn = (msg) => warnings.push(msg);
    
    try {
        // Enable logging
        config.set('logFunctionWarnings', true);
        functionRegistry.executeFunction('exp', ['invalid']);
        expect(warnings.length).toBe(1);
        expect(warnings[0]).toContain('exp');
        expect(warnings[0]).toContain('Expected number');
        
        // Reset warnings
        warnings.length = 0;
        
        // Disable logging
        config.set('logFunctionWarnings', false);
        functionRegistry.executeFunction('exp', ['invalid']);
        expect(warnings.length).toBe(0);
        
    } finally {
        console.warn = originalConsoleWarn;
        config.set('logFunctionWarnings', false);
    }
});

test('Scalar Functions > exp function > should handle special number values', () => {
    expect(functionRegistry.executeFunction('exp', [0])).toBe(1);
    expect(functionRegistry.executeFunction('exp', [Infinity])).toBe(Infinity);
    expect(functionRegistry.executeFunction('exp', [-Infinity])).toBe(0);
    expect(functionRegistry.executeFunction('exp', [NaN])).toBeNaN();
});