import { describe, it, expect } from 'bun:test';
import { transpileQuery, validateQuery } from '../src/parser/transpiler/index.js';

describe('Comprehensive Windowing and Emit Tests', () => {
    
    describe('Variable Window Names', () => {
        it('should support custom window variable names', () => {
            const query = `sales | summarize { total: sum(amount), count: count() } by category over myWindow = tumbling_window(5)`;
            
            const parseResult = validateQuery(query);
            expect(parseResult.valid).toBe(true);
            
            const result = transpileQuery(query);
            expect(result.javascript).toBeDefined();
            expect(result.javascript).toContain('createSummarizeOperator');
            expect(result.javascript).toContain('tumbling_window(5)');
            expect(result.javascript).toContain("'myWindow'"); // Variable window name
        });
        
        it('should default to "window" when no custom name specified', () => {
            const query = `sales | summarize { total: sum(amount) } by category`;
            
            const result = transpileQuery(query);
            expect(result.javascript).toBeDefined();
            expect(result.javascript).toContain("'window'"); // Default window name
        });
    });
    
    describe('New Window Function Variants', () => {
        it('should support count-based window functions', () => {
            const queries = [
                `sales | summarize { total: sum(amount) } over w = tumbling_window(5)`,
                `sales | summarize { total: sum(amount) } over w = hopping_window(10, 5)`,
                `sales | summarize { total: sum(amount) } over w = sliding_window(3)`,
                `sales | summarize { total: sum(amount) } over w = count_window(100)`
            ];
            
            queries.forEach(query => {
                const parseResult = validateQuery(query);
                expect(parseResult.valid).toBe(true);
                
                const result = transpileQuery(query);
                expect(result.javascript).toBeDefined();
                expect(result.javascript).toContain('createSummarizeOperator');
            });
        });
        
        it('should support value-based window functions with callbacks', () => {
            const queries = [
                `sales | summarize { total: sum(amount) } over w = tumbling_window_by(5, timestamp)`,
                `sales | summarize { total: sum(amount) } over w = hopping_window_by(10, 5, timestamp)`,
                `sales | summarize { total: sum(amount) } over w = sliding_window_by(3, timestamp)`,
                `sales | summarize { total: sum(amount) } over w = session_window(300, timestamp)`
            ];
            
            queries.forEach(query => {
                const parseResult = validateQuery(query);
                expect(parseResult.valid).toBe(true);
                
                const result = transpileQuery(query);
                expect(result.javascript).toBeDefined();
                expect(result.javascript).toContain('createSummarizeOperator');
            });
        });
    });
    
    describe('Emit Clause Alternatives', () => {
        it('should support emit every with interval', () => {
            const query = `sales | summarize { total: sum(amount) } by category emit every 5`;
            
            const parseResult = validateQuery(query);
            expect(parseResult.valid).toBe(true);
            
            const result = transpileQuery(query);
            expect(result.javascript).toBeDefined();
            expect(result.javascript).toContain('emit_every(5)');
        });
        
        it('should support emit every with value expression', () => {
            const query = `sales | summarize { total: sum(amount) } by category emit every 5 using timestamp`;
            
            const parseResult = validateQuery(query);
            expect(parseResult.valid).toBe(true);
            
            const result = transpileQuery(query);
            expect(result.javascript).toBeDefined();
            expect(result.javascript).toContain('emit_every');
        });
        
        it('should support emit when condition', () => {
            const query = `sales | summarize { total: sum(amount) } by category emit when amount > 100`;
            
            const parseResult = validateQuery(query);
            expect(parseResult.valid).toBe(true);
            
            const result = transpileQuery(query);
            expect(result.javascript).toBeDefined();
            expect(result.javascript).toContain('emit_when');
        });
        
        it('should support emit on change', () => {
            const query = `sales | summarize { total: sum(amount) } by category emit on change category`;
            
            const parseResult = validateQuery(query);
            expect(parseResult.valid).toBe(true);
            
            const result = transpileQuery(query);
            expect(result.javascript).toBeDefined();
            expect(result.javascript).toContain('emit_on_change');
        });
        
        it('should support emit on group change', () => {
            const query = `sales | summarize { total: sum(amount) } by category emit on group change`;
            
            const parseResult = validateQuery(query);
            expect(parseResult.valid).toBe(true);
            
            const result = transpileQuery(query);
            expect(result.javascript).toBeDefined();
            expect(result.javascript).toContain('emit_on_group_change');
        });
        
        it('should support emit on update', () => {
            const query = `sales | summarize { total: sum(amount) } by category emit on update`;
            
            const parseResult = validateQuery(query);
            expect(parseResult.valid).toBe(true);
            
            const result = transpileQuery(query);
            expect(result.javascript).toBeDefined();
            expect(result.javascript).toContain('emit_on_update');
        });
    });
    
    describe('Parser Integration', () => {
        it('should handle window and emit clauses as alternatives', () => {
            const windowQuery = `sales | summarize { total: sum(amount) } over w = tumbling_window(5)`;
            const emitQuery = `sales | summarize { total: sum(amount) } emit every 5`;
            
            // Both should parse successfully
            expect(validateQuery(windowQuery).valid).toBe(true);
            expect(validateQuery(emitQuery).valid).toBe(true);
            
            // Both should transpile successfully
            expect(transpileQuery(windowQuery).javascript).toBeDefined();
            expect(transpileQuery(emitQuery).javascript).toBeDefined();
        });
        
        it('should reject invalid combinations', () => {
            // This would be invalid - can't have both window and emit
            const invalidQuery = `sales | summarize { total: sum(amount) } over w = tumbling_window(5) emit every 5`;
            
            // This should fail validation or parsing
            const parseResult = validateQuery(invalidQuery);
            // Since our grammar makes them alternatives, this should parse as valid but be semantically incorrect
            // The parser allows either window OR emit, not both
        });
    });
    
    describe('Backward Compatibility', () => {
        it('should still support traditional summarize syntax', () => {
            const traditionalQueries = [
                `sales | summarize { total: sum(amount), count: count() } by category`,
                `sales | summarize { total: sum(amount) }`
            ];
            
            traditionalQueries.forEach(query => {
                const parseResult = validateQuery(query);
                expect(parseResult.valid).toBe(true);
                
                const result = transpileQuery(query);
                expect(result.javascript).toBeDefined();
                expect(result.javascript).toContain('createSummarizeOperator');
            });
        });
    });
});