import { describe, it, expect, beforeEach } from 'bun:test';
import { 
    tumbling_window, 
    hopping_window, 
    sliding_window, 
    session_window, 
    count_window 
} from '../src/core/window-functions.js';

describe('Window Functions', () => {
    describe('Tumbling Window', () => {
        it('should create count-based tumbling windows', () => {
            const windowSpec = tumbling_window(3); // 3 items per window
            const windowFunc = windowSpec.createWindowFunc();
            
            // Test first window (items 0, 1, 2)
            const result1 = windowFunc({ id: 1 });
            expect(result1).toHaveLength(1);
            expect(result1[0]._id).toBe(0);
            expect(result1[0].start).toBe(0);
            expect(result1[0].end).toBe(3);
            expect(result1[0].type).toBe('tumbling');
            
            const result2 = windowFunc({ id: 2 });
            expect(result2[0]._id).toBe(0); // Still window 0
            
            const result3 = windowFunc({ id: 3 });
            expect(result3[0]._id).toBe(0); // Still window 0
            
            // Fourth item should be in window 1
            const result4 = windowFunc({ id: 4 });
            expect(result4[0]._id).toBe(1);
            expect(result4[0].start).toBe(3);
            expect(result4[0].end).toBe(6);
        });
        
        it('should create time-based tumbling windows', () => {
            const windowSpec = tumbling_window(1000, 'timestamp'); // 1000ms windows
            const windowFunc = windowSpec.createWindowFunc();
            
            const result1 = windowFunc({ timestamp: 500, id: 1 });
            expect(result1).toHaveLength(1);
            expect(result1[0]._id).toBe(0);
            expect(result1[0].start).toBe(0);
            expect(result1[0].end).toBe(1000);
            
            const result2 = windowFunc({ timestamp: 1500, id: 2 });
            expect(result2[0]._id).toBe(1000);
            expect(result2[0].start).toBe(1000);
            expect(result2[0].end).toBe(2000);
        });
    });
    
    describe('Hopping Window', () => {
        it('should create overlapping count-based windows', () => {
            const windowSpec = hopping_window(3, 2); // size=3, hop=2
            const windowFunc = windowSpec.createWindowFunc();
            
            // First item (index 0) should be in window 0
            const result1 = windowFunc({ id: 1 });
            expect(result1).toHaveLength(1);
            expect(result1[0]._id).toBe(0);
            
            // Second item (index 1) should be in window 0
            const result2 = windowFunc({ id: 2 });
            expect(result2).toHaveLength(1);
            expect(result2[0]._id).toBe(0);
            
            // Third item (index 2) should be in windows 0 and 1
            const result3 = windowFunc({ id: 3 });
            expect(result3).toHaveLength(2);
            const windowIds = result3.map(w => w._id).sort();
            expect(windowIds).toEqual([0, 1]);
        });
        
        it('should create overlapping time-based windows', () => {
            const windowSpec = hopping_window(1000, 500, 'timestamp'); // size=1000ms, hop=500ms
            const windowFunc = windowSpec.createWindowFunc();
            
            // Timestamp 750 should be in windows starting at 0 and 500
            const result = windowFunc({ timestamp: 750, id: 1 });
            expect(result).toHaveLength(2);
            const windowStarts = result.map(w => w.start).sort();
            expect(windowStarts).toEqual([0, 500]);
        });
    });
    
    describe('Sliding Window', () => {
        it('should create sliding count-based windows', () => {
            const windowSpec = sliding_window(2); // 2 items per window
            const windowFunc = windowSpec.createWindowFunc();
            
            const result1 = windowFunc({ id: 1 });
            expect(result1).toHaveLength(1);
            expect(result1[0]._id).toBe(0);
            expect(result1[0].start).toBe(0);
            expect(result1[0].end).toBe(1);
            
            const result2 = windowFunc({ id: 2 });
            expect(result2[0]._id).toBe(1);
            expect(result2[0].start).toBe(0);
            expect(result2[0].end).toBe(2);
            
            const result3 = windowFunc({ id: 3 });
            expect(result3[0]._id).toBe(2);
            expect(result3[0].start).toBe(1);
            expect(result3[0].end).toBe(3);
        });
        
        it('should create sliding time-based windows', () => {
            const windowSpec = sliding_window(1000, 'timestamp'); // 1000ms windows
            const windowFunc = windowSpec.createWindowFunc();
            
            const result1 = windowFunc({ timestamp: 2000, id: 1 });
            expect(result1).toHaveLength(1);
            expect(result1[0]._id).toBe(2000);
            expect(result1[0].start).toBe(1001);
            expect(result1[0].end).toBe(2001);
        });
    });
    
    describe('Session Window', () => {
        it('should group events by session gaps', () => {
            const windowSpec = session_window(1000, 'timestamp'); // 1000ms timeout
            const windowFunc = windowSpec.createWindowFunc();
            
            // First event starts session 1
            const result1 = windowFunc({ timestamp: 1000, id: 1 });
            expect(result1).toHaveLength(1);
            expect(result1[0]._id).toBe(1);
            expect(result1[0].start).toBe(1000);
            
            // Second event within timeout, same session
            const result2 = windowFunc({ timestamp: 1500, id: 2 });
            expect(result2[0]._id).toBe(1); // Same session
            
            // Third event after timeout, new session
            const result3 = windowFunc({ timestamp: 3000, id: 3 });
            expect(result3[0]._id).toBe(2); // New session
            expect(result3[0].start).toBe(3000);
        });
        
        it('should require timeField parameter', () => {
            expect(() => session_window(1000)).toThrow('Session windows require a valueExpr parameter');
        });
    });
    
    describe('Count Window', () => {
        it('should trigger every N items', () => {
            const windowSpec = count_window(3); // Every 3 items
            const windowFunc = windowSpec.createWindowFunc();
            
            const result1 = windowFunc({ id: 1 });
            expect(result1).toHaveLength(1);
            expect(result1[0]._id).toBe(0);
            expect(result1[0].start).toBe(0);
            expect(result1[0].end).toBe(3);
            expect(result1[0].type).toBe('count');
            
            const result2 = windowFunc({ id: 2 });
            expect(result2[0]._id).toBe(0); // Same window
            
            const result3 = windowFunc({ id: 3 });
            expect(result3[0]._id).toBe(0); // Same window
            
            const result4 = windowFunc({ id: 4 });
            expect(result4[0]._id).toBe(1); // New window
            expect(result4[0].start).toBe(3);
            expect(result4[0].end).toBe(6);
        });
    });
});