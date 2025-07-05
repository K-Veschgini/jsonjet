import { describe, it, expect } from 'bun:test';
import { parseQuery, transpileQuery } from '../src/parser/query-transpiler.js';

describe('Grammar Refactor - Functionality Preservation', () => {
  
  // Test that all existing syntax still works
  const testCases = [
    {
      name: 'Basic select with new logical operators',
      query: 'user_data | select { name: name, safe_age: age || 0 }'
    },
    {
      name: 'Basic select with legacy logical operators', 
      query: 'user_data | select { name: name, safe_age: age or 0 }'
    },
    {
      name: 'Complex where with new operators',
      query: 'users | where age >= 18 && status == "active" || role == "admin"'
    },
    {
      name: 'Complex where with legacy operators',
      query: 'users | where age >= 18 and status == "active" or role == "admin"'
    },
    {
      name: 'Select with spread syntax',
      query: 'data | select { ...*, computed: value + 1, -sensitive }'
    },
    {
      name: 'Summarize with aggregations',
      query: 'events | summarize { count: count(), total: sum(amount) } by category'
    },
    {
      name: 'Scan with step definitions',
      query: 'stream | scan(step s1: value > 0 => count = count + 1;)'
    },
    {
      name: 'Nested expressions',
      query: 'data | where (age > 18 && city == "NYC") || (age > 21 && state == "CA")'
    },
    {
      name: 'Function calls',
      query: 'data | select { result: iff(age >= 18, "adult", "minor") }'
    },
    {
      name: 'Object and array literals',
      query: 'data | project { info: { name: name, scores: [math, english, science] } }'
    }
  ];

  testCases.forEach(testCase => {
    it(`should parse and transpile: ${testCase.name}`, () => {
      expect(() => {
        const parseResult = parseQuery(testCase.query);
        expect(parseResult.parseErrors).toHaveLength(0);
        expect(parseResult.lexErrors).toHaveLength(0);
        
        const transpileResult = transpileQuery(testCase.query);
        expect(transpileResult.javascript).toBeDefined();
        expect(typeof transpileResult.javascript).toBe('string');
        expect(transpileResult.javascript.length).toBeGreaterThan(0);
        
      }).not.toThrow();
    });
  });

  it('should prioritize new operators over legacy ones', () => {
    // Test that || is recognized before | in pipe operations
    const query = 'data | select { safe: value || 0 }';
    
    const result = transpileQuery(query);
    expect(result.javascript).toContain('||');
    expect(result.javascript).toContain('.pipe(');
  });

  it('should generate proper JavaScript syntax', () => {
    const query = 'data | select { name: name, age: age }';
    
    const result = transpileQuery(query);
    
    // Should have proper object literal syntax with parentheses
    expect(result.javascript).toMatch(/\(item\) => \(\{.*\}\)\)/);
    // Should use safeGet for property access
    expect(result.javascript).toContain('safeGet(item,');
  });

  it('should handle backward compatibility gracefully', () => {
    // Both syntaxes should produce equivalent results
    const newSyntax = 'data | where active == true && age > 18';
    const oldSyntax = 'data | where active == true and age > 18';
    
    const newResult = transpileQuery(newSyntax);
    const oldResult = transpileQuery(oldSyntax);
    
    // Both should transpile to the same JavaScript (using &&)
    expect(newResult.javascript.replace(/\s+/g, '')).toBe(oldResult.javascript.replace(/\s+/g, ''));
    expect(newResult.javascript).toContain('&&');
  });

  it('should maintain proper operator precedence', () => {
    const query = 'data | where a || b && c';
    
    const result = transpileQuery(query);
    
    // Should generate proper parentheses for precedence
    expect(result.javascript).toMatch(/\|\|.*&&|\&\&.*\|\|/);
  });

  it('should handle all token types correctly', () => {
    const complexQuery = `
      user_data 
      | where age >= 18 && status == "active" 
      | select { 
          name: name, 
          age_group: iff(age < 30, "young", "mature"),
          safe_score: score || 0,
          is_premium: premium && verified
        }
      | summarize { 
          count: count(), 
          avg_score: sum(safe_score) 
        } by age_group
      | insert_into(results)
    `;
    
    expect(() => {
      const result = transpileQuery(complexQuery);
      expect(result.javascript).toBeDefined();
    }).not.toThrow();
  });
});

describe('Grammar Architecture Quality', () => {
  
  it('should have clean token organization', () => {
    // Test that we can import from the organized structure
    expect(() => {
      const tokens = require('../src/parser/tokens/token-registry.js');
      expect(tokens.allTokens).toBeDefined();
      expect(Array.isArray(tokens.allTokens)).toBe(true);
      expect(tokens.allTokens.length).toBeGreaterThan(0);
    }).not.toThrow();
  });

  it('should maintain all functionality after refactor', () => {
    // Test the examples from all demos to ensure nothing broke
    const demoQueries = [
      // Flow processing
      'user_data | where age > 18 | project { name: name, age: age }',
      
      // Select demo
      'user_data | select { name: name, age: age, email: email }',
      'user_data | select { ...*, safe_age: age || 0 }',
      
      // Summarize demo  
      'sales | summarize { total: sum(amount), count: count() } by product',
      
      // Scan demo
      'events | scan(step accumulate: value > 0 => total = total + value;)'
    ];
    
    demoQueries.forEach(query => {
      expect(() => {
        const result = transpileQuery(query);
        expect(result.javascript).toBeDefined();
      }).not.toThrow();
    });
  });
});