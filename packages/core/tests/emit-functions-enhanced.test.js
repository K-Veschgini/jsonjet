import { describe, it, expect, beforeEach } from 'bun:test';
import { 
    emit_every, 
    emit_when,
    emit_on_change, 
    emit_on_group_change 
} from '../src/core/emit-functions.js';

describe('Enhanced Emit Functions', () => {
    describe('Unified emit_every', () => {
        it('should work with count-based (default)', () => {
            const emitSpec = emit_every(3); // Every 3 items
            const emitFunc = emitSpec.createEmitFunc();
            
            // First item always emits
            expect(emitFunc.shouldEmit({ id: 1 })).toBe(true);
            
            // Next 2 items don't emit
            expect(emitFunc.shouldEmit({ id: 2 })).toBe(false);
            expect(emitFunc.shouldEmit({ id: 3 })).toBe(false);
            
            // Fourth item should emit (count = 4, last emit at 1, 4-1=3 >= 3)
            expect(emitFunc.shouldEmit({ id: 4 })).toBe(true);
            
            const info = emitFunc.getEmitInfo();
            expect(info.type).toBe('every');
            expect(info.interval).toBe(3);
            expect(info.itemCount).toBe(4);
        });
        
        it('should work with timestamp field', () => {
            const emitSpec = emit_every(1000, 'timestamp'); // Every 1000ms
            const emitFunc = emitSpec.createEmitFunc();
            
            // First timestamp always emits
            expect(emitFunc.shouldEmit({ timestamp: 1500, id: 1 })).toBe(true);
            
            // Close timestamp doesn't emit
            expect(emitFunc.shouldEmit({ timestamp: 1800, id: 2 })).toBe(false);
            
            // Far enough timestamp should emit
            expect(emitFunc.shouldEmit({ timestamp: 2600, id: 3 })).toBe(true);
        });
        
        it('should work with computed timestamp', () => {
            const emitSpec = emit_every(500, (item) => item.created + item.delay);
            const emitFunc = emitSpec.createEmitFunc();
            
            // First always emits
            expect(emitFunc.shouldEmit({ created: 1000, delay: 200, id: 1 })).toBe(true); // total: 1200
            
            // Close value doesn't emit
            expect(emitFunc.shouldEmit({ created: 1400, delay: 100, id: 2 })).toBe(false); // total: 1500, diff: 300 < 500
            
            // Far value should emit
            expect(emitFunc.shouldEmit({ created: 1800, delay: 0, id: 3 })).toBe(true); // total: 1800, diff: 600 >= 500
        });
        
        it('should work with monotonic sequence numbers', () => {
            const emitSpec = emit_every(10, 'seq');
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(emitFunc.shouldEmit({ seq: 1, id: 1 })).toBe(true);
            expect(emitFunc.shouldEmit({ seq: 5, id: 2 })).toBe(false);
            expect(emitFunc.shouldEmit({ seq: 12, id: 3 })).toBe(true); // 12 - 1 = 11 >= 10
        });
        
        it('should error on non-numeric field values', () => {
            const emitSpec = emit_every(100, 'invalid_field');
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(() => emitFunc.shouldEmit({ invalid_field: 'not_a_number' }))
                .toThrow('must contain a number');
        });
        
        it('should error on non-numeric function results', () => {
            const emitSpec = emit_every(100, (item) => item.name); // Returns string
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(() => emitFunc.shouldEmit({ name: 'Alice' }))
                .toThrow('Value expression must return a number');
        });
    });
    
    describe('emit_when (Conditional)', () => {
        it('should emit when field is truthy', () => {
            const emitSpec = emit_when('is_important');
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(emitFunc.shouldEmit({ is_important: true, id: 1 })).toBe(true);
            expect(emitFunc.shouldEmit({ is_important: false, id: 2 })).toBe(false);
            expect(emitFunc.shouldEmit({ is_important: 1, id: 3 })).toBe(true);
            expect(emitFunc.shouldEmit({ is_important: 0, id: 4 })).toBe(false);
            expect(emitFunc.shouldEmit({ is_important: 'yes', id: 5 })).toBe(true);
            expect(emitFunc.shouldEmit({ is_important: '', id: 6 })).toBe(false);
        });
        
        it('should emit when function returns truthy', () => {
            const emitSpec = emit_when((item) => item.amount > 1000);
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(emitFunc.shouldEmit({ amount: 1500, id: 1 })).toBe(true);
            expect(emitFunc.shouldEmit({ amount: 500, id: 2 })).toBe(false);
            expect(emitFunc.shouldEmit({ amount: 1001, id: 3 })).toBe(true);
        });
        
        it('should emit when complex condition is met', () => {
            const emitSpec = emit_when((item) => item.status === 'error' || item.priority > 5);
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(emitFunc.shouldEmit({ status: 'error', priority: 1, id: 1 })).toBe(true);
            expect(emitFunc.shouldEmit({ status: 'ok', priority: 8, id: 2 })).toBe(true);
            expect(emitFunc.shouldEmit({ status: 'ok', priority: 3, id: 3 })).toBe(false);
        });
        
        it('should handle missing fields as falsy', () => {
            const emitSpec = emit_when('missing_field');
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(emitFunc.shouldEmit({ id: 1 })).toBe(false); // undefined is falsy
        });
        
        it('should get emit info', () => {
            const emitSpec = emit_when((item) => item.alert);
            const emitFunc = emitSpec.createEmitFunc();
            
            const info = emitFunc.getEmitInfo();
            expect(info.type).toBe('when');
            expect(typeof info.conditionExpr).toBe('function');
        });
    });
    
    describe('emit_on_change (Enhanced)', () => {
        it('should work with nested field functions', () => {
            const emitSpec = emit_on_change((item) => item.user.department);
            const emitFunc = emitSpec.createEmitFunc();
            
            // First always emits
            expect(emitFunc.shouldEmit({ user: { department: 'engineering' }, id: 1 })).toBe(true);
            
            // Same department doesn't emit
            expect(emitFunc.shouldEmit({ user: { department: 'engineering' }, id: 2 })).toBe(false);
            
            // Different department emits
            expect(emitFunc.shouldEmit({ user: { department: 'sales' }, id: 3 })).toBe(true);
        });
        
        it('should work with complex computed values', () => {
            const emitSpec = emit_on_change((item) => `${item.region}-${item.category}`);
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(emitFunc.shouldEmit({ region: 'us', category: 'books', id: 1 })).toBe(true);
            expect(emitFunc.shouldEmit({ region: 'us', category: 'books', id: 2 })).toBe(false);
            expect(emitFunc.shouldEmit({ region: 'eu', category: 'books', id: 3 })).toBe(true);
            expect(emitFunc.shouldEmit({ region: 'eu', category: 'electronics', id: 4 })).toBe(true);
        });
    });
    
    describe('emit_on_group_change (No Changes)', () => {
        it('should work as before', () => {
            const emitSpec = emit_on_group_change();
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(emitFunc.shouldEmit({ id: 1 }, 'group_a')).toBe(true);
            expect(emitFunc.shouldEmit({ id: 2 }, 'group_a')).toBe(false);
            expect(emitFunc.shouldEmit({ id: 3 }, 'group_b')).toBe(true);
        });
    });
    
    describe('Error Handling', () => {
        it('should handle invalid emit_every valueExpr types', () => {
            const emitSpec = emit_every(100, 123); // Invalid type
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(() => emitFunc.shouldEmit({ id: 1 }))
                .toThrow('valueExpr must be a field name (string), function, or null');
        });
        
        it('should handle invalid emit_when conditionExpr types', () => {
            const emitSpec = emit_when(123); // Invalid type
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(() => emitFunc.shouldEmit({ id: 1 }))
                .toThrow('conditionExpr must be a field name (string) or function');
        });
    });
});