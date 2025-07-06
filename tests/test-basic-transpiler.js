console.log('=== TESTING BASIC TRANSPILER ===\n');

async function testTranspiler() {
    try {
        console.log('1. Testing old import path...');
        const { transpileQuery: oldTranspile } = await import('./src/parser/query-transpiler.js');
        console.log('✅ Old import works');
        
        console.log('2. Testing simple query...');
        const simpleQuery = 'user_data | where age > 18';
        const result1 = oldTranspile(simpleQuery);
        console.log('✅ Simple query works');
        console.log('Result:', result1.javascript);
        
        console.log('\n3. Testing project query...');
        const projectQuery = 'user_data | project { name: name, age: age }';
        const result2 = oldTranspile(projectQuery);
        console.log('✅ Project query works');
        console.log('Result:', result2.javascript);
        
        console.log('\n4. Testing select query...');
        const selectQuery = 'user_data | select { name: name, age: age }';
        const result3 = oldTranspile(selectQuery);
        console.log('✅ Select query works');
        console.log('Result:', result3.javascript);
        
        console.log('\n5. Testing complex query...');
        const complexQuery = 'user_data | where age > 18 | project { name: name, age: age, status: "processed" }';
        const result4 = oldTranspile(complexQuery);
        console.log('✅ Complex query works');
        console.log('Result:', result4.javascript);
        
        console.log('\n6. Testing new import path...');
        const { transpileQuery: newTranspile } = await import('./src/parser/transpiler/index.js');
        console.log('✅ New import works');
        
        const result5 = newTranspile(simpleQuery);
        console.log('✅ New transpiler works');
        console.log('Result:', result5.javascript);
        
        // Test if results are equivalent
        if (result1.javascript === result5.javascript) {
            console.log('✅ Old and new transpilers produce same output');
        } else {
            console.log('❌ Different output!');
            console.log('Old:', result1.javascript);
            console.log('New:', result5.javascript);
        }
        
    } catch (error) {
        console.error('❌ Transpiler test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testTranspiler().then(() => {
    console.log('\n=== TRANSPILER TEST COMPLETE ===');
});