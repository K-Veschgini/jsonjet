import { describe, it, expect } from 'bun:test';
import { 
    tumbling_window, tumbling_window_by,
    hopping_window, hopping_window_by,
    sliding_window, sliding_window_by,
    session_window, 
    count_window 
} from '../src/core/window-functions.js';
import { 
    emit_every, 
    emit_when,
    emit_on_change, 
    emit_on_group_change 
} from '../src/core/emit-functions.js';

describe('Callback-Based API', () => {
    describe('Window Functions with Callbacks', () => {
        it('should work with tumbling window and callback', () => {
            const windowSpec = tumbling_window_by(1000, (item) => item.timestamp);
            const windowFunc = windowSpec.createWindowFunc();
            
            const result = windowFunc({ timestamp: 1500, id: 1 });
            expect(result).toHaveLength(1);
            expect(result[0]._id).toBe(1000);
            expect(result[0].type).toBe('tumbling');
        });
        
        it('should work with hopping window and complex callback', () => {
            const windowSpec = hopping_window_by(1000, 500, (item) => item.event_time + item.delay);
            const windowFunc = windowSpec.createWindowFunc();
            
            const result = windowFunc({ event_time: 700, delay: 50, id: 1 }); // total: 750
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].type).toBe('hopping');
        });
        
        it('should work with session window and callback', () => {
            const windowSpec = session_window(1000, (item) => item.ts);
            const windowFunc = windowSpec.createWindowFunc();
            
            const result1 = windowFunc({ ts: 1000, id: 1 });
            expect(result1[0]._id).toBe(1);
            
            const result2 = windowFunc({ ts: 1500, id: 2 }); // Within timeout
            expect(result2[0]._id).toBe(1); // Same session
            
            const result3 = windowFunc({ ts: 3000, id: 3 }); // Beyond timeout
            expect(result3[0]._id).toBe(2); // New session
        });
        
        it('should work with count-based windows (no callback)', () => {
            const windowSpec = tumbling_window(3); // No callback = count-based
            const windowFunc = windowSpec.createWindowFunc();
            
            const result1 = windowFunc({ id: 1 });
            expect(result1[0]._id).toBe(0);
            
            // 4th item goes to window 1
            windowFunc({ id: 2 });
            windowFunc({ id: 3 });
            const result4 = windowFunc({ id: 4 });
            expect(result4[0]._id).toBe(1);
        });
    });
    
    describe('Emit Functions with Callbacks', () => {
        it('should work with emit_every and callback', () => {
            const emitSpec = emit_every(1000, (item) => item.timestamp);
            const emitFunc = emitSpec.createEmitFunc();
            
            // First always emits
            expect(emitFunc.shouldEmit({ timestamp: 1000, id: 1 })).toBe(true);
            
            // Close timestamp doesn't emit
            expect(emitFunc.shouldEmit({ timestamp: 1500, id: 2 })).toBe(false);
            
            // Far timestamp emits
            expect(emitFunc.shouldEmit({ timestamp: 2100, id: 3 })).toBe(true);
        });
        
        it('should work with emit_when and callback', () => {
            const emitSpec = emit_when((item) => item.amount > 1000);
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(emitFunc.shouldEmit({ amount: 1500, id: 1 })).toBe(true);
            expect(emitFunc.shouldEmit({ amount: 500, id: 2 })).toBe(false);
            expect(emitFunc.shouldEmit({ amount: 2000, id: 3 })).toBe(true);
        });
        
        it('should work with emit_on_change and callback', () => {
            const emitSpec = emit_on_change((item) => item.status);
            const emitFunc = emitSpec.createEmitFunc();
            
            // First always emits
            expect(emitFunc.shouldEmit({ status: 'active', id: 1 })).toBe(true);
            
            // Same status doesn't emit
            expect(emitFunc.shouldEmit({ status: 'active', id: 2 })).toBe(false);
            
            // Changed status emits
            expect(emitFunc.shouldEmit({ status: 'inactive', id: 3 })).toBe(true);
        });
        
        it('should work with complex nested callbacks', () => {
            const emitSpec = emit_on_change((item) => `${item.user.region}-${item.category}`);
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(emitFunc.shouldEmit({ user: { region: 'us' }, category: 'books', id: 1 })).toBe(true);
            expect(emitFunc.shouldEmit({ user: { region: 'us' }, category: 'books', id: 2 })).toBe(false);
            expect(emitFunc.shouldEmit({ user: { region: 'eu' }, category: 'books', id: 3 })).toBe(true);
        });
        
        it('should work with count-based emit (no callback)', () => {
            const emitSpec = emit_every(3); // No callback = count-based
            const emitFunc = emitSpec.createEmitFunc();
            
            // First always emits
            expect(emitFunc.shouldEmit({ id: 1 })).toBe(true);
            
            // Next 2 don't emit
            expect(emitFunc.shouldEmit({ id: 2 })).toBe(false);
            expect(emitFunc.shouldEmit({ id: 3 })).toBe(false);
            
            // 4th emits (count went from 1 to 4, diff = 3)
            expect(emitFunc.shouldEmit({ id: 4 })).toBe(true);
        });
    });
    
    describe('Numeric Value Assumption', () => {
        it('should work with int and double values', () => {
            const emitSpec = emit_every(5.5, (item) => item.value);
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(emitFunc.shouldEmit({ value: 10.0, id: 1 })).toBe(true);
            expect(emitFunc.shouldEmit({ value: 12.3, id: 2 })).toBe(false); // diff: 2.3 < 5.5
            expect(emitFunc.shouldEmit({ value: 16.7, id: 3 })).toBe(true); // diff: 6.7 >= 5.5
        });
        
        it('should work with timestamp-like values', () => {
            const windowSpec = tumbling_window_by(86400000, (item) => item.created_at); // 1 day windows
            const windowFunc = windowSpec.createWindowFunc();
            
            const result = windowFunc({ created_at: 1625097600000, id: 1 }); // July 1, 2021
            expect(result[0].type).toBe('tumbling');
            expect(result[0].size).toBe(86400000);
        });
    });
});