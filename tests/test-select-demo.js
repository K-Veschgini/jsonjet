// Simple test to debug select demo syntax issues
import { transpileQuery } from './src/parser/query-transpiler.js';

// The problematic select demo content
const selectDemo = `// JSDB Select Operator Demo
// Learn the new select syntax with spread, exclusions, and transformations

// 1. Create streams for testing select operations
create stream user_data;
create stream clean_output;
create stream transformed_output;
create stream excluded_output;

// 2. Demo 1: Basic field selection (like project but safer)
// Select only specific fields - missing fields return undefined safely
create flow basic_select from user_data 
  | select { name: name, age: age, email: email } 
  | insert_into(clean_output);

// 3. Demo 2: Spread and transform - include all fields plus computed ones
create flow spread_transform from user_data 
  | select { ...*, full_name: name + " " + surname, is_adult: age >= 18 } 
  | insert_into(transformed_output);

// 4. Demo 3: Spread with exclusions - all fields except sensitive ones
create flow spread_exclude from user_data 
  | select { ...*, -password, -ssn, safe_age: age || 0 } 
  | insert_into(excluded_output);

// 5. Insert test data with various field combinations
insert into user_data { name: "John", surname: "Doe", age: 30, email: "john@example.com", password: "secret123", ssn: "123-45-6789" };

// 6. Insert incomplete data (missing fields handled gracefully)
insert into user_data { name: "Jane", age: 25 };

// 7. Insert data with null values
insert into user_data { name: "Bob", surname: "Wilson", age: null, email: "bob@example.com" };

// 8. Insert minimal data
insert into user_data { name: "Alice" };

// 9. Check results - notice no errors despite missing/null fields!
list streams;`;

console.log('Testing individual statements from select demo...\n');

// Extract just the query statements to test
const queryStatements = [
    'user_data | select { name: name, age: age, email: email }',
    'user_data | select { ...*, full_name: name + " " + surname, is_adult: age >= 18 }',
    'user_data | select { ...*, -password, -ssn, safe_age: age || 0 }'
];

for (let i = 0; i < queryStatements.length; i++) {
    const query = queryStatements[i];
    console.log(`--- Testing Query ${i + 1} ---`);
    console.log(`Query: ${query}`);
    
    try {
        const result = transpileQuery(query);
        console.log('✅ Transpilation successful!');
        console.log('JavaScript:', result.javascript);
    } catch (error) {
        console.error('❌ Transpilation failed:', error.message);
        console.error('Full error:', error);
    }
    console.log('');
}

console.log('Testing complete!');