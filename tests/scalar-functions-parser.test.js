import { test, expect } from 'bun:test';
import { transpileQuery } from '../src/parser/transpiler/core/transpile-api.js';

test('Scalar Functions > Parser Integration > should parse exp function call', () => {
    const query = 'test | select { result: exp(value) }';
    const result = transpileQuery(query);
    
    expect(result.javascript).toContain('functionRegistry.execute');
    expect(result.javascript).toContain("'exp'");
    expect(result.imports).toContain('functionRegistry');
});

test('Scalar Functions > Parser Integration > should parse function with multiple arguments', () => {
    const query = 'test | select { result: someFunc(a, b, c) }';
    const result = transpileQuery(query);
    
    expect(result.javascript).toContain('functionRegistry.execute');
    expect(result.javascript).toContain("'someFunc'");
});

test('Scalar Functions > Parser Integration > should parse function with no arguments', () => {
    const query = 'test | select { result: rand() }';
    const result = transpileQuery(query);
    
    expect(result.javascript).toContain('functionRegistry.execute');
    expect(result.javascript).toContain("'rand'");
    expect(result.javascript).toContain('[]');
});

test('Scalar Functions > Parser Integration > should parse nested function calls', () => {
    const query = 'test | select { result: exp(log(value)) }';
    const result = transpileQuery(query);
    
    // Should contain both function calls
    expect(result.javascript).toContain("functionRegistry.execute('exp'");
    expect(result.javascript).toContain("functionRegistry.execute('log'");
});