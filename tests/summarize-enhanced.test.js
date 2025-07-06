import { describe, it, expect, beforeEach } from 'bun:test';
import { SummarizeOperator } from '../src/operators/summarize.js';
import { sum, count } from '../src/aggregations/core/aggregation-object.js';
import { tumbling_window, hopping_window, sliding_window, count_window } from '../src/core/window-functions.js';
import { emit_every_count, emit_on_change } from '../src/core/emit-functions.js';

describe('Enhanced Summarize Operations', () => {
    let results;
    let summarizeOp;
    
    beforeEach(() => {
        results = [];
    });
    
    const setupOperator = (op) => {
        op.downstream = {
            push: (item) => results.push(item),
            process: async (item) => results.push(item)
        };
        return op;
    };
    
    describe('No Window Mode (Original Behavior)', () => {
        it('should accumulate until flush', async () => {
            const aggregationSpec = {
                total: sum((item) => item.amount),
                count: count()
            };
            
            summarizeOp = setupOperator(new SummarizeOperator(
                aggregationSpec, 
                (item) => item.category
            ));
            
            await summarizeOp.process({ category: 'A', amount: 100 });
            await summarizeOp.process({ category: 'A', amount: 200 });
            await summarizeOp.process({ category: 'B', amount: 50 });
            
            // No results until flush
            expect(results).toHaveLength(0);
            
            await summarizeOp.flush();
            
            expect(results).toHaveLength(2);
            const categoryA = results.find(r => r.group_key === 'A');
            const categoryB = results.find(r => r.group_key === 'B');
            
            expect(categoryA.total).toBe(300);
            expect(categoryA.count).toBe(2);
            expect(categoryB.total).toBe(50);
            expect(categoryB.count).toBe(1);
        });
    });
    
    describe('Tumbling Window Mode', () => {
        it('should emit when window fills (count-based)', async () => {
            const aggregationSpec = {
                total: sum((item) => item.amount),
                count: count()
            };
            
            summarizeOp = setupOperator(new SummarizeOperator(
                aggregationSpec,
                (item) => item.category,
                tumbling_window(2) // 2 items per window
            ));
            
            await summarizeOp.process({ category: 'A', amount: 100 });
            await summarizeOp.process({ category: 'A', amount: 200 });
            // Add third item to trigger window 0 close
            await summarizeOp.process({ category: 'A', amount: 300 });
            
            // Window should close and emit results
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].total).toBe(300);
            expect(results[0].count).toBe(2);
            expect(results[0].group_key).toBe('A');
            expect(results[0].window).toBeDefined();
            expect(results[0].window.type).toBe('tumbling');
        });
    });
    
    describe('Hopping Window Mode', () => {
        it('should handle overlapping windows', async () => {
            const aggregationSpec = {
                total: sum((item) => item.amount),
                count: count()
            };
            
            summarizeOp = setupOperator(new SummarizeOperator(
                aggregationSpec,
                (item) => item.category,
                hopping_window(3, 2) // size=3, hop=2
            ));
            
            // Add items that will create overlapping windows
            await summarizeOp.process({ category: 'A', amount: 100 });
            await summarizeOp.process({ category: 'A', amount: 200 });
            await summarizeOp.process({ category: 'A', amount: 300 }); // This will be in both windows
            await summarizeOp.process({ category: 'A', amount: 400 });
            
            // Should have results from closed windows
            expect(results.length).toBeGreaterThan(0);
            
            // Check that we have window information
            const hasWindowInfo = results.every(r => r.window && r.window.type === 'hopping');
            expect(hasWindowInfo).toBe(true);
        });
    });
    
    describe('Sliding Window Mode', () => {
        it('should create new window for each item', async () => {
            const aggregationSpec = {
                total: sum((item) => item.amount),
                count: count()
            };
            
            summarizeOp = setupOperator(new SummarizeOperator(
                aggregationSpec,
                (item) => item.category,
                sliding_window(2) // 2 items per window
            ));
            
            await summarizeOp.process({ category: 'A', amount: 100 });
            await summarizeOp.process({ category: 'A', amount: 200 });
            await summarizeOp.process({ category: 'A', amount: 300 });
            
            // Each item creates/closes windows
            expect(results.length).toBeGreaterThan(0);
            
            // Check that we have sliding window information
            const hasSlidingInfo = results.some(r => r.window && r.window.type === 'sliding');
            expect(hasSlidingInfo).toBe(true);
        });
    });
    
    describe('Count Window Mode', () => {
        it('should emit every N items', async () => {
            const aggregationSpec = {
                total: sum((item) => item.amount),
                count: count()
            };
            
            summarizeOp = setupOperator(new SummarizeOperator(
                aggregationSpec,
                (item) => item.category,
                count_window(2) // Every 2 items
            ));
            
            await summarizeOp.process({ category: 'A', amount: 100 });
            await summarizeOp.process({ category: 'A', amount: 200 });
            // Add third item to trigger window 0 close
            await summarizeOp.process({ category: 'A', amount: 300 });
            
            // Should emit after window closes
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].window.type).toBe('count');
            expect(results[0].window.count).toBe(2);
        });
    });
    
    describe('Emit Mode - Count Based', () => {
        it('should emit every N items', async () => {
            const aggregationSpec = {
                total: sum((item) => item.amount),
                count: count()
            };
            
            summarizeOp = setupOperator(new SummarizeOperator(
                aggregationSpec,
                (item) => item.category,
                null, // no window
                emit_every_count(2) // emit every 2 items
            ));
            
            await summarizeOp.process({ category: 'A', amount: 100 });
            expect(results).toHaveLength(0); // No emit yet
            
            await summarizeOp.process({ category: 'A', amount: 200 });
            expect(results).toHaveLength(1); // Should emit now
            
            expect(results[0].total).toBe(300);
            expect(results[0].count).toBe(2);
            expect(results[0].group_key).toBe('A');
            expect(results[0].emit_info).toBeDefined();
            expect(results[0].emit_info.type).toBe('count');
        });
    });
    
    describe('Emit Mode - On Change', () => {
        it('should emit when field changes', async () => {
            const aggregationSpec = {
                total: sum((item) => item.amount),
                count: count()
            };
            
            summarizeOp = setupOperator(new SummarizeOperator(
                aggregationSpec,
                (item) => item.category,
                null, // no window
                emit_on_change('status') // emit when status changes
            ));
            
            await summarizeOp.process({ category: 'A', amount: 100, status: 'active' });
            expect(results).toHaveLength(1); // First item always emits
            
            await summarizeOp.process({ category: 'A', amount: 200, status: 'active' });
            expect(results).toHaveLength(1); // Same status, no emit
            
            await summarizeOp.process({ category: 'A', amount: 300, status: 'inactive' });
            expect(results).toHaveLength(2); // Status changed, should emit
            
            expect(results[1].total).toBe(600); // Accumulated total
            expect(results[1].count).toBe(3);
            expect(results[1].emit_info.type).toBe('change');
        });
    });
    
    describe('Error Handling', () => {
        it('should prevent using both window and emit', () => {
            expect(() => {
                new SummarizeOperator(
                    { count: count() },
                    null,
                    tumbling_window(2),
                    emit_every_count(2)
                );
            }).toThrow('Cannot use both window and emit specifications');
        });
    });
});