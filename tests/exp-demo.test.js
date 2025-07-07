import { test, expect } from 'bun:test';
import { expDemo } from '../demo-bun/src/demos/exp-demo.js';

test('exp demo > should be a valid demo string', () => {
    expect(typeof expDemo).toBe('string');
    expect(expDemo.length).toBeGreaterThan(0);
    expect(expDemo).toContain('exp(x)');
    expect(expDemo).toContain('create stream numbers;');
    expect(expDemo).toContain('create stream results;');
    expect(expDemo).toContain('insert into numbers { x: 0 };');
    expect(expDemo).toContain('insert into numbers { x: 1 };');
    expect(expDemo).toContain('insert into numbers { x: 2 };');
    expect(expDemo).toContain('flush numbers;');
});