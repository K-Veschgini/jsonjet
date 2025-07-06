import { describe, it, expect, beforeEach } from 'bun:test';
import { 
    tumbling_window, 
    hopping_window, 
    sliding_window, 
    session_window, 
    count_window 
} from '../src/core/window-functions.js';

describe('Enhanced Window Functions', () => {
    describe('Tumbling Window - Flexible Value Expression', () => {
        it('should work with field names', () => {
            const windowSpec = tumbling_window(1000, 'timestamp');
            const windowFunc = windowSpec.createWindowFunc();
            
            const result1 = windowFunc({ timestamp: 500, id: 1 });
            expect(result1).toHaveLength(1);
            expect(result1[0]._id).toBe(0);
            expect(result1[0].start).toBe(0);
            expect(result1[0].end).toBe(1000);
            
            const result2 = windowFunc({ timestamp: 1500, id: 2 });
            expect(result2[0]._id).toBe(1000);
        });
        
        it('should work with computed functions', () => {
            const windowSpec = tumbling_window(100, (item) => item.metrics.timestamp);
            const windowFunc = windowSpec.createWindowFunc();
            
            const result = windowFunc({ metrics: { timestamp: 250 }, id: 1 });
            expect(result).toHaveLength(1);
            expect(result[0]._id).toBe(200);
            expect(result[0].start).toBe(200);
            expect(result[0].end).toBe(300);
        });
        
        it('should work with complex expressions', () => {
            const windowSpec = tumbling_window(1000, (item) => item.created_at + item.delay);
            const windowFunc = windowSpec.createWindowFunc();
            
            const result = windowFunc({ created_at: 1500, delay: 200, id: 1 });
            expect(result[0]._id).toBe(1000); // (1500 + 200) / 1000 = 1.7 -> floor = 1 -> 1 * 1000 = 1000
        });
        
        it('should error on non-numeric values', () => {
            const windowSpec = tumbling_window(100, 'invalid_field');
            const windowFunc = windowSpec.createWindowFunc();
            
            expect(() => windowFunc({ invalid_field: 'not_a_number' }))
                .toThrow('Value expression must return a number');
        });
    });
    
    describe('Hopping Window - Flexible Value Expression', () => {
        it('should handle multiple overlapping windows with computed values', () => {
            const windowSpec = hopping_window(1000, 500, (item) => item.event_time);
            const windowFunc = windowSpec.createWindowFunc();
            
            const result = windowFunc({ event_time: 750, id: 1 });
            expect(result).toHaveLength(2);
            const windowStarts = result.map(w => w.start).sort();
            expect(windowStarts).toEqual([0, 500]);
        });
        
        it('should work with nested field access', () => {
            const windowSpec = hopping_window(100, 50, 'payload.ts');
            const windowFunc = windowSpec.createWindowFunc();
            
            const result = windowFunc({ payload: { ts: 125 }, id: 1 });
            expect(result).toHaveLength(2);
        });
    });
    
    describe('Sliding Window - Flexible Value Expression', () => {
        it('should slide with timestamp-based values', () => {
            const windowSpec = sliding_window(1000, (item) => item.ts);
            const windowFunc = windowSpec.createWindowFunc();
            
            const result1 = windowFunc({ ts: 2000, id: 1 });
            expect(result1[0]._id).toBe(2000);
            expect(result1[0].start).toBe(1001);
            expect(result1[0].end).toBe(2001);
            
            const result2 = windowFunc({ ts: 2500, id: 2 });
            expect(result2[0]._id).toBe(2500);
            expect(result2[0].start).toBe(1501);
        });
    });
    
    describe('Session Window - Flexible Value Expression', () => {
        it('should group sessions using computed timestamps', () => {
            const windowSpec = session_window(1000, (item) => item.created + item.offset);
            const windowFunc = windowSpec.createWindowFunc();
            
            // First event
            const result1 = windowFunc({ created: 1000, offset: 0, id: 1 });
            expect(result1[0]._id).toBe(1);
            expect(result1[0].start).toBe(1000);
            
            // Within session timeout
            const result2 = windowFunc({ created: 1800, offset: 100, id: 2 }); // total: 1900
            expect(result2[0]._id).toBe(1); // Same session
            
            // Beyond timeout
            const result3 = windowFunc({ created: 3000, offset: 500, id: 3 }); // total: 3500
            expect(result3[0]._id).toBe(2); // New session
        });
        
        it('should require valueExpr parameter', () => {
            expect(() => session_window(1000)).toThrow('Session windows require a valueExpr parameter');
        });
        
        it('should error on invalid value expression', () => {
            const windowSpec = session_window(1000, 'invalid_field');
            const windowFunc = windowSpec.createWindowFunc();
            
            expect(() => windowFunc({ invalid_field: 'not_a_number' }))
                .toThrow('Value expression must return a number');
        });
    });
    
    describe('Count Window - No Changes Needed', () => {
        it('should work as before (count-based only)', () => {
            const windowSpec = count_window(3);
            const windowFunc = windowSpec.createWindowFunc();
            
            const result1 = windowFunc({ id: 1 }); // itemCount = 0, windowId = 0
            expect(result1[0]._id).toBe(0);
            
            const result2 = windowFunc({ id: 2 }); // itemCount = 1, windowId = 0
            expect(result2[0]._id).toBe(0);
            
            const result3 = windowFunc({ id: 3 }); // itemCount = 2, windowId = 0
            expect(result3[0]._id).toBe(0);
            
            const result4 = windowFunc({ id: 4 }); // itemCount = 3, windowId = 1
            expect(result4[0]._id).toBe(1);
        });
    });
    
    describe('Error Handling', () => {
        it('should handle invalid valueExpr types', () => {
            const windowSpec = tumbling_window(100, 123); // Invalid type
            const windowFunc = windowSpec.createWindowFunc();
            
            expect(() => windowFunc({ id: 1 }))
                .toThrow('valueExpr must be a string (field name) or function');
        });
        
        it('should handle missing fields gracefully', () => {
            const windowSpec = tumbling_window(100, 'missing_field');
            const windowFunc = windowSpec.createWindowFunc();
            
            // Should get undefined, which fails the number check
            expect(() => windowFunc({ id: 1 }))
                .toThrow('Value expression must return a number');
        });
    });
});