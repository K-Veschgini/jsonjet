import { test, expect } from 'bun:test';
import { functionRegistry, config } from '../src/functions/index.js';

test('Scalar Functions > exp function > should be registered', () => {
    expect(functionRegistry.has('exp')).toBe(true);
});

test('Scalar Functions > exp function > should calculate e^x correctly', () => {
    const result = functionRegistry.execute('exp', [1]);
    expect(result).toBeCloseTo(Math.E, 10);
});

test('Scalar Functions > exp function > should return null for non-numbers', () => {
    expect(functionRegistry.execute('exp', ['abc'])).toBeNull();
    expect(functionRegistry.execute('exp', [true])).toBeNull();
    expect(functionRegistry.execute('exp', [null])).toBeNull();
    expect(functionRegistry.execute('exp', [undefined])).toBeNull();
});

test('Scalar Functions > exp function > should return null for wrong argument count', () => {
    expect(functionRegistry.execute('exp', [])).toBeNull();
    expect(functionRegistry.execute('exp', [1, 2])).toBeNull();
});

test('Scalar Functions > config > should control warning logging', () => {
    const originalConsoleWarn = console.warn;
    const warnings = [];
    console.warn = (msg) => warnings.push(msg);
    
    try {
        // Enable logging
        config.set('logFunctionWarnings', true);
        functionRegistry.execute('exp', ['invalid']);
        expect(warnings.length).toBe(1);
        expect(warnings[0]).toContain('exp');
        expect(warnings[0]).toContain('Expected number');
        
        // Reset warnings
        warnings.length = 0;
        
        // Disable logging
        config.set('logFunctionWarnings', false);
        functionRegistry.execute('exp', ['invalid']);
        expect(warnings.length).toBe(0);
        
    } finally {
        console.warn = originalConsoleWarn;
        config.set('logFunctionWarnings', false);
    }
});

test('Scalar Functions > exp function > should handle special number values', () => {
    expect(functionRegistry.execute('exp', [0])).toBe(1);
    expect(functionRegistry.execute('exp', [Infinity])).toBe(Infinity);
    expect(functionRegistry.execute('exp', [-Infinity])).toBe(0);
    expect(functionRegistry.execute('exp', [NaN])).toBeNaN();
});