import { describe, it, expect, beforeEach } from 'bun:test';
import { 
    emit_every, 
    emit_every_count, 
    emit_on_change, 
    emit_on_group_change 
} from '../src/core/emit-functions.js';

describe('Emit Functions', () => {
    describe('Emit Every (Time-based)', () => {
        it('should emit every specified interval', async () => {
            const emitSpec = emit_every(100); // 100ms interval
            const emitFunc = emitSpec.createEmitFunc();
            
            // First call should emit (first time)
            expect(emitFunc.shouldEmit({ id: 1 })).toBe(true);
            
            // Immediate second call should not emit
            expect(emitFunc.shouldEmit({ id: 2 })).toBe(false);
            
            // Wait for interval and try again
            await new Promise(resolve => setTimeout(resolve, 150));
            expect(emitFunc.shouldEmit({ id: 3 })).toBe(true);
            
            // Force emit should always work
            expect(emitFunc.forceEmit()).toBe(true);
        });
    });
    
    describe('Emit Every Count', () => {
        it('should emit every N items', () => {
            const emitSpec = emit_every_count(3); // Every 3 items
            const emitFunc = emitSpec.createEmitFunc();
            
            // First 2 items should not emit
            expect(emitFunc.shouldEmit({ id: 1 })).toBe(false);
            expect(emitFunc.shouldEmit({ id: 2 })).toBe(false);
            
            // Third item should emit
            expect(emitFunc.shouldEmit({ id: 3 })).toBe(true);
            
            // Next 2 items should not emit
            expect(emitFunc.shouldEmit({ id: 4 })).toBe(false);
            expect(emitFunc.shouldEmit({ id: 5 })).toBe(false);
            
            // Sixth item should emit
            expect(emitFunc.shouldEmit({ id: 6 })).toBe(true);
        });
    });
    
    describe('Emit On Change', () => {
        it('should emit when field value changes', () => {
            const emitSpec = emit_on_change('status'); // Watch 'status' field
            const emitFunc = emitSpec.createEmitFunc();
            
            // First item should always emit
            expect(emitFunc.shouldEmit({ status: 'active', id: 1 })).toBe(true);
            
            // Same status should not emit
            expect(emitFunc.shouldEmit({ status: 'active', id: 2 })).toBe(false);
            
            // Different status should emit
            expect(emitFunc.shouldEmit({ status: 'inactive', id: 3 })).toBe(true);
            
            // Same new status should not emit
            expect(emitFunc.shouldEmit({ status: 'inactive', id: 4 })).toBe(false);
            
            // Another change should emit
            expect(emitFunc.shouldEmit({ status: 'pending', id: 5 })).toBe(true);
        });
        
        it('should emit when function value changes', () => {
            const emitSpec = emit_on_change(item => item.user.role); // Watch nested field
            const emitFunc = emitSpec.createEmitFunc();
            
            // First item should always emit
            expect(emitFunc.shouldEmit({ user: { role: 'admin' }, id: 1 })).toBe(true);
            
            // Same role should not emit
            expect(emitFunc.shouldEmit({ user: { role: 'admin' }, id: 2 })).toBe(false);
            
            // Different role should emit
            expect(emitFunc.shouldEmit({ user: { role: 'user' }, id: 3 })).toBe(true);
        });
        
        it('should handle null and undefined values', () => {
            const emitSpec = emit_on_change('optional_field');
            const emitFunc = emitSpec.createEmitFunc();
            
            // First item with undefined should emit
            expect(emitFunc.shouldEmit({ id: 1 })).toBe(true);
            
            // Another undefined should not emit
            expect(emitFunc.shouldEmit({ id: 2 })).toBe(false);
            
            // Null should emit (different from undefined)
            expect(emitFunc.shouldEmit({ optional_field: null, id: 3 })).toBe(true);
            
            // Another null should not emit
            expect(emitFunc.shouldEmit({ optional_field: null, id: 4 })).toBe(false);
            
            // Value should emit
            expect(emitFunc.shouldEmit({ optional_field: 'value', id: 5 })).toBe(true);
        });
        
        it('should throw error for invalid field specification', () => {
            const emitSpec = emit_on_change(123); // Invalid type
            const emitFunc = emitSpec.createEmitFunc();
            
            expect(() => emitFunc.shouldEmit({ id: 1 }))
                .toThrow('emit_on_change requires a field name (string) or function');
        });
    });
    
    describe('Emit On Group Change', () => {
        it('should emit when group key changes', () => {
            const emitSpec = emit_on_group_change();
            const emitFunc = emitSpec.createEmitFunc();
            
            // First group should always emit
            expect(emitFunc.shouldEmit({ id: 1 }, 'group_a')).toBe(true);
            
            // Same group should not emit
            expect(emitFunc.shouldEmit({ id: 2 }, 'group_a')).toBe(false);
            
            // Different group should emit
            expect(emitFunc.shouldEmit({ id: 3 }, 'group_b')).toBe(true);
            
            // Same new group should not emit
            expect(emitFunc.shouldEmit({ id: 4 }, 'group_b')).toBe(false);
            
            // Back to first group should emit
            expect(emitFunc.shouldEmit({ id: 5 }, 'group_a')).toBe(true);
            
        });
    });
});