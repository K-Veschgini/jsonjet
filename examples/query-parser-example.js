import { parseQuery } from '../src/parser/query-parser.js';

// Example queries to test the parser
const queries = [
    // Simple source reference
    'users',
    
    // Simple filter
    'users | where age > 25',
    
    // Filter with string comparison
    'events | where name == "login"',
    
    // Project columns
    'users | project name, email',
    
    // Combined operations
    'users | where age > 18 | project name, email',
    
    // Complex filter with AND/OR
    'events | where (type == "error" or type == "warning") and timestamp > 1234567890',
    
    // Boolean literals
    'users | where active == true',
    
    // Multiple filters
    'logs | where level == "error" | where timestamp > 12345 | project message, timestamp',
    
    // IFF in WHERE clause
    'users | where iff(age > 25, true, false) == true',
    
    // IFF with string values
    'events | where iff(type == "error", true, false) == true',
    
    // Simple scan with one step
    'users | scan (step s1: true => s1.count = iff(s1.count >= 10, 1, s1.count + 1);)',
    
    // Scan with cumulative operations
    'events | scan (step s1: type == "error" => s1.cumulative_x = iff(s1.cumulative_x >= 10, x, x + s1.cumulative_x);)',
    
    // Scan with multiple statements
    'users | scan (step s1: age > 25 => s1.count = s1.count + 1, s1.total_age = s1.total_age + age;)',
    
    // Scan with emit function
            'events | scan (step s1: type == "error" => s1.error_count = s1.error_count + 1, emit(s1.error_count);)'
];

console.log('Testing Kusto-like Query Parser\n');
console.log('='.repeat(50));

queries.forEach((query, index) => {
    console.log(`\nTest ${index + 1}: ${query}`);
    console.log('-'.repeat(30));
    
    try {
        const result = parseQuery(query);
        console.log('✅ Parsed successfully!');
        console.log(`Tokens found: ${result.tokens.length}`);
        console.log('Token types:', result.tokens.map(t => t.tokenType.name).join(', '));
        
        // You can inspect the CST (Concrete Syntax Tree) if needed
        // console.log('CST:', JSON.stringify(result.cst, null, 2));
        
    } catch (error) {
        console.log('❌ Parse error:', error.message);
    }
});

console.log('\n' + '='.repeat(50));
console.log('Parser test completed!'); 