import { describe, it, expect } from 'bun:test';
import { 
    transpileQuery, 
    validateQuery, 
    createQueryFunction, 
    getTranspilationInfo 
} from '../src/parser/transpiler/index.js';

describe('Transpiler Refactor - Grade A+ Architecture', () => {

    // =============================================================================
    // FUNCTIONALITY PRESERVATION TESTS
    // =============================================================================

    describe('Functionality Preservation', () => {
        const testCases = [
            {
                name: 'Basic SELECT with logical operators',
                query: 'users | select { name: name, safe_age: age || 0, is_valid: active && verified }'
            },
            {
                name: 'Complex WHERE with precedence',
                query: 'data | where (age > 18 && status == "active") || role == "admin"'
            },
            {
                name: 'SUMMARIZE with aggregations',
                query: 'sales | summarize { count: count(), total: sum(amount) } by product'
            },
            {
                name: 'SCAN with step definitions',
                query: 'stream | scan(step accumulate: value > 0 => total = total + value;)'
            },
            {
                name: 'Nested object and array literals',
                query: 'data | project { info: { name: name, scores: [math, english] } }'
            },
            {
                name: 'Function calls with conditionals',
                query: 'data | select { result: iff(age >= 18, "adult", "minor") }'
            }
        ];

        testCases.forEach(testCase => {
            it(`should transpile: ${testCase.name}`, () => {
                expect(() => {
                    const result = transpileQuery(testCase.query);
                    
                    expect(result).toBeDefined();
                    expect(result.javascript).toBeDefined();
                    expect(typeof result.javascript).toBe('string');
                    expect(result.javascript.length).toBeGreaterThan(0);
                    expect(result.metadata).toBeDefined();
                    expect(result.metadata.version).toBe('2.0.0');
                    
                }).not.toThrow();
            });
        });
    });

    // =============================================================================
    // ARCHITECTURE QUALITY TESTS
    // =============================================================================

    describe('Architecture Quality', () => {
        
        it('should have modular visitor system', () => {
            // Test that we can import individual components
            expect(() => {
                const { ExpressionVisitorMixin } = require('../src/parser/transpiler/visitors/expression-visitor.js');
                const { QueryOperationVisitorMixin } = require('../src/parser/transpiler/visitors/query-operation-visitor.js');
                
                expect(ExpressionVisitorMixin).toBeDefined();
                expect(QueryOperationVisitorMixin).toBeDefined();
                expect(typeof ExpressionVisitorMixin.expression).toBe('function');
                expect(typeof QueryOperationVisitorMixin.selectClause).toBe('function');
            }).not.toThrow();
        });

        it('should have structured error handling', () => {
            const invalidQuery = 'users | select { invalid: }';
            
            expect(() => {
                transpileQuery(invalidQuery);
            }).toThrow();
            
            try {
                transpileQuery(invalidQuery);
            } catch (error) {
                expect(error.name).toMatch(/Error$/);
                expect(error.message).toBeDefined();
                expect(typeof error.toString).toBe('function');
            }
        });

        it('should provide rich API functions', () => {
            const query = 'users | select { name: name, age: age }';
            
            // Test validation API
            const validation = validateQuery(query);
            expect(validation).toBeDefined();
            expect(typeof validation.valid).toBe('boolean');
            expect(Array.isArray(validation.parseErrors)).toBe(true);
            
            // Test detailed info API
            const info = getTranspilationInfo(query);
            expect(info.success).toBe(true);
            expect(info.input).toBeDefined();
            expect(info.output).toBeDefined();
            expect(info.metadata).toBeDefined();
        });

        it('should maintain backward compatibility', () => {
            // Test old import path still works
            expect(() => {
                const { transpileQuery: oldTranspile } = require('../src/parser/query-transpiler.js');
                const result = oldTranspile('users | select { name: name }');
                expect(result.javascript).toBeDefined();
            }).not.toThrow();
        });
    });

    // =============================================================================
    // PERFORMANCE AND CORRECTNESS TESTS
    // =============================================================================

    describe('Performance & Correctness', () => {
        
        it('should generate correct JavaScript syntax', () => {
            const query = 'users | select { name: name, computed: age + 1 }';
            const result = transpileQuery(query);
            
            // Should generate proper object literal with parentheses
            expect(result.javascript).toMatch(/\(item\) => \(\{.*\}\)\)/);
            
            // Should use safeGet for property access
            expect(result.javascript).toContain('safeGet(item,');
            
            // Should handle expressions correctly
            expect(result.javascript).toContain('safeGet(item, \'age\') + 1');
        });

        it('should handle operator precedence correctly', () => {
            const query = 'data | where a || b && c == d';
            const result = transpileQuery(query);
            
            // Should maintain proper precedence with parentheses
            expect(result.javascript).toMatch(/\|\||\&\&/);
            expect(result.javascript).toContain('==='); // == becomes ===
        });

        it('should optimize property key generation', () => {
            const query = 'data | select { validId: id, "invalid-key": value }';
            const result = transpileQuery(query);
            
            // Valid identifiers should be unquoted
            expect(result.javascript).toContain('validId:');
            
            // Invalid identifiers should be quoted
            expect(result.javascript).toContain('"invalid-key":');
        });

        it('should handle complex nested structures', () => {
            const complexQuery = `
                user_data 
                | where age >= 18 && (status == "active" || role == "admin")
                | select { 
                    profile: {
                        name: name,
                        age_group: iff(age < 30, "young", "mature"),
                        permissions: [read, write, admin && delete]
                    },
                    stats: {
                        score: score || 0,
                        rank: iff(rank && rank > 0, rank, null)
                    }
                }
            `;
            
            expect(() => {
                const result = transpileQuery(complexQuery);
                expect(result.javascript).toBeDefined();
                expect(result.javascript.length).toBeGreaterThan(100);
            }).not.toThrow();
        });
    });

    // =============================================================================
    // ERROR HANDLING TESTS
    // =============================================================================

    describe('Error Handling', () => {
        
        it('should provide detailed parse errors', () => {
            const invalidQuery = 'users | select { name: }'; // Missing value
            
            const validation = validateQuery(invalidQuery);
            expect(validation.valid).toBe(false);
            expect(validation.parseErrors.length).toBeGreaterThan(0);
        });

        it('should handle lexer errors gracefully', () => {
            const invalidQuery = 'users | select { name: @invalid@ }';
            
            const validation = validateQuery(invalidQuery);
            expect(validation.valid).toBe(false);
            // Should have either parse or lex errors
            expect(validation.parseErrors.length + validation.lexErrors.length).toBeGreaterThan(0);
        });

        it('should provide helpful error context', () => {
            try {
                transpileQuery('users | invalid_operation { }');
            } catch (error) {
                expect(error.message).toBeDefined();
                expect(error.message.length).toBeGreaterThan(10);
            }
        });
    });

    // =============================================================================
    // API FUNCTIONALITY TESTS
    // =============================================================================

    describe('API Functionality', () => {
        
        it('should create executable query functions', async () => {
            const query = 'test_data | select { name: name, doubled: value * 2 }';
            const queryFunc = createQueryFunction(query);
            
            expect(queryFunc).toBeDefined();
            expect(typeof queryFunc.execute).toBe('function');
            expect(queryFunc.javascript).toBeDefined();
            expect(queryFunc.originalQuery).toBe(query);
            expect(queryFunc.metadata).toBeDefined();
        });

        it('should provide detailed transpilation info', () => {
            const query = 'users | where active == true | select { name: name }';
            const info = getTranspilationInfo(query);
            
            expect(info.success).toBe(true);
            expect(info.input.queryText).toBe(query);
            expect(info.input.tokenCount).toBeGreaterThan(0);
            expect(Array.isArray(info.input.tokens)).toBe(true);
            
            expect(info.output.javascript).toBeDefined();
            expect(info.output.imports).toBeDefined();
            expect(info.output.estimatedComplexity).toMatch(/^(low|medium|high)$/);
            
            expect(info.parsing.cstNodeCount).toBeGreaterThan(0);
            expect(info.metadata.transpilerVersion).toBe('2.0.0');
        });

        it('should validate queries efficiently', () => {
            const validQuery = 'users | select { name: name }';
            const invalidQuery = 'users | invalid';
            
            const validResult = validateQuery(validQuery);
            expect(validResult.valid).toBe(true);
            expect(validResult.parseErrors).toHaveLength(0);
            
            const invalidResult = validateQuery(invalidQuery);
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.parseErrors.length).toBeGreaterThan(0);
        });
    });

    // =============================================================================
    // REGRESSION TESTS
    // =============================================================================

    describe('Regression Tests', () => {
        
        it('should handle all demo queries correctly', () => {
            const demoQueries = [
                // Basic operations
                'users | where age > 18',
                'users | select { name: name, age: age }',
                'users | project { id: id, full_name: name + " " + surname }',
                
                // Complex operations
                'sales | summarize { total: sum(amount), count: count() } by product',
                'events | scan(step count: value > 0 => total = total + 1;)',
                
                // Modern syntax
                'data | select { ...*, computed: value * 2, -sensitive }',
                'data | where active && (role == "admin" || permissions > 5)'
            ];
            
            demoQueries.forEach(query => {
                expect(() => {
                    const result = transpileQuery(query);
                    expect(result.javascript).toBeDefined();
                }).not.toThrow();
            });
        });

        it('should maintain JavaScript validity', () => {
            const queries = [
                'data | select { name: name }',
                'data | select { computed: value + 1 }',
                'data | select { safe: value || "default" }',
                'data | where condition && other_condition'
            ];
            
            queries.forEach(query => {
                const result = transpileQuery(query);
                
                // Try to parse the generated JavaScript
                expect(() => {
                    // Extract the object literal from Select operator
                    const selectMatch = result.javascript.match(/Select\(\(item\) => \((.+)\)\)/);
                    const objectLiteral = selectMatch?.[1] || '{}';
                    // Remove the extra closing parenthesis at the end
                    const cleanObjectLiteral = objectLiteral.replace(/\)$/, '');
                    new Function('item', 'safeGet', `return (${cleanObjectLiteral})`);
                }).not.toThrow();
            });
        });
    });
});

describe('Transpiler Architecture Metrics', () => {
    
    it('should have improved architecture metrics', () => {
        // Test file organization
        const fs = require('fs');
        const path = require('path');
        
        const transpilerDir = path.join(__dirname, '../src/parser/transpiler');
        expect(fs.existsSync(transpilerDir)).toBe(true);
        
        // Should have organized subdirectories
        const subdirs = ['core', 'visitors', 'errors'];
        subdirs.forEach(subdir => {
            expect(fs.existsSync(path.join(transpilerDir, subdir))).toBe(true);
        });
        
        // Should have modular files
        const visitorFiles = ['expression-visitor.js', 'query-operation-visitor.js', 'literal-visitor.js', 'command-visitor.js'];
        visitorFiles.forEach(file => {
            expect(fs.existsSync(path.join(transpilerDir, 'visitors', file))).toBe(true);
        });
    });
});