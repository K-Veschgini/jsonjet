import { test, expect } from 'bun:test';
import { UDDSketch } from '../src/aggregations/sketches/uddsketch.js';

test('UDDSketch - Basic functionality', () => {
    const sketch = new UDDSketch(0.01);
    
    // Test empty sketch
    expect(sketch.count).toBe(0);
    expect(sketch.median()).toBeNaN();
    expect(sketch.quantile(0.5)).toBeNaN();
    expect(sketch.percentile(50)).toBeNaN();
    
    // Add some values
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    values.forEach(v => sketch.add(v));
    
    expect(sketch.count).toBe(10);
    expect(sketch.min).toBe(1);
    expect(sketch.max).toBe(10);
});

test('UDDSketch - Quantile calculations', () => {
    const sketch = new UDDSketch(0.01);
    
    // Add values 1-100
    for (let i = 1; i <= 100; i++) {
        sketch.add(i);
    }
    
    // Test exact boundaries
    expect(sketch.quantile(0)).toBe(1);
    expect(sketch.quantile(1)).toBe(100);
    
    // Test median (should be around 50.5)
    const median = sketch.median();
    expect(median).toBeGreaterThan(45);
    expect(median).toBeLessThan(55);
    
    // Test 25th and 75th percentiles
    const p25 = sketch.percentile(25);
    const p75 = sketch.percentile(75);
    expect(p25).toBeGreaterThan(20);
    expect(p25).toBeLessThan(30);
    expect(p75).toBeGreaterThan(70);
    expect(p75).toBeLessThan(80);
});

test('UDDSketch - Handles negative values', () => {
    const sketch = new UDDSketch(0.01);
    
    const values = [-10, -5, 0, 5, 10];
    values.forEach(v => sketch.add(v));
    
    expect(sketch.count).toBe(5);
    expect(sketch.min).toBe(-10);
    expect(sketch.max).toBe(10);
    
    const median = sketch.median();
    expect(median).toBeCloseTo(0, 1);
});

test('UDDSketch - Handles zero values', () => {
    const sketch = new UDDSketch(0.01);
    
    [0, 0, 0, 1, 2].forEach(v => sketch.add(v));
    
    expect(sketch.count).toBe(5);
    expect(sketch.zeroCount).toBe(3);
    
    const median = sketch.median();
    expect(median).toBe(0);
});

test('UDDSketch - Input validation', () => {
    const sketch = new UDDSketch(0.01);
    
    // Invalid alpha
    expect(() => new UDDSketch(0)).toThrow();
    expect(() => new UDDSketch(1)).toThrow();
    expect(() => new UDDSketch(1.5)).toThrow();
    
    // Invalid values
    expect(() => sketch.add(NaN)).toThrow();
    expect(() => sketch.add(Infinity)).toThrow();
    expect(() => sketch.add('not a number')).toThrow();
    
    // Invalid quantile/percentile ranges
    expect(() => sketch.quantile(-0.1)).toThrow();
    expect(() => sketch.quantile(1.1)).toThrow();
    expect(() => sketch.percentile(-1)).toThrow();
    expect(() => sketch.percentile(101)).toThrow();
});

test('UDDSketch - Reset functionality', () => {
    const sketch = new UDDSketch(0.01);
    
    [1, 2, 3, 4, 5].forEach(v => sketch.add(v));
    expect(sketch.count).toBe(5);
    
    sketch.reset();
    expect(sketch.count).toBe(0);
    expect(sketch.zeroCount).toBe(0);
    expect(sketch.min).toBe(Number.POSITIVE_INFINITY);
    expect(sketch.max).toBe(Number.NEGATIVE_INFINITY);
    expect(sketch.median()).toBeNaN();
});

test('UDDSketch - Accuracy with large dataset', () => {
    const sketch = new UDDSketch(0.05); // 5% error tolerance
    
    // Generate 1000 values from 1 to 1000
    for (let i = 1; i <= 1000; i++) {
        sketch.add(i);
    }
    
    // Test that median is reasonably close to 500.5
    const median = sketch.median();
    const expectedMedian = 500.5;
    const relativeError = Math.abs(median - expectedMedian) / expectedMedian;
    expect(relativeError).toBeLessThan(0.1); // Within 10% (generous bound)
    
    // Test 90th percentile (should be around 900)
    const p90 = sketch.percentile(90);
    const expectedP90 = 900;
    const p90Error = Math.abs(p90 - expectedP90) / expectedP90;
    expect(p90Error).toBeLessThan(0.1);
});

test('UDDSketch - Different alpha values', () => {
    const highPrecision = new UDDSketch(0.001);
    const lowPrecision = new UDDSketch(0.1);
    
    // Add same data to both
    for (let i = 1; i <= 100; i++) {
        highPrecision.add(i);
        lowPrecision.add(i);
    }
    
    const highMedian = highPrecision.median();
    const lowMedian = lowPrecision.median();
    
    // Both should give reasonable results
    expect(highMedian).toBeGreaterThan(45);
    expect(highMedian).toBeLessThan(55);
    expect(lowMedian).toBeGreaterThan(40);
    expect(lowMedian).toBeLessThan(60);
});