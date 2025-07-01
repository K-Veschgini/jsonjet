import { Stream } from '../src/core/stream.js';
import { transpileQuery, createQueryFunction } from '../src/parser/query-transpiler.js';

console.log('=== Working Query Language Demo ===\n');

// Sample data
const salesData = [
    { product: 'laptop', category: 'electronics', price: 1200, quantity: 2 },
    { product: 'mouse', category: 'electronics', price: 25, quantity: 5 },
    { product: 'book', category: 'books', price: 15, quantity: 3 },
    { product: 'keyboard', category: 'electronics', price: 75, quantity: 1 },
    { product: 'monitor', category: 'electronics', price: 300, quantity: 2 },
    { product: 'novel', category: 'books', price: 20, quantity: 4 }
];

async function demo1() {
    console.log('1. Basic summarize with new sum syntax');
    const query = 'data | summarize { count: count(), total_revenue: sum(price * quantity) } | collect()';
    console.log(`   Query: ${query}`);
    
    const queryFunc = createQueryFunction(query);
    console.log(`   Generated: ${queryFunc.javascript}`);
    await queryFunc.execute(salesData);
}

async function demo2() {
    console.log('\n2. Simple field sum');
    const query = 'data | summarize { count: count(), total_price: sum(price) } | collect()';
    console.log(`   Query: ${query}`);
    
    const queryFunc = createQueryFunction(query);
    await queryFunc.execute(salesData);
}

async function demo3() {
    console.log('\n3. Group by category');
    const query = 'data | summarize { count: count(), revenue: sum(price * quantity) } by category | collect()';
    console.log(`   Query: ${query}`);
    
    const queryFunc = createQueryFunction(query);
    await queryFunc.execute(salesData);
}

async function demo4() {
    console.log('\n4. Complex arithmetic');
    const query = 'data | summarize { items: count(), discounted_revenue: sum(price * quantity * 0.9) } | collect()';
    console.log(`   Query: ${query}`);
    
    const queryFunc = createQueryFunction(query);
    await queryFunc.execute(salesData);
}

async function demo5() {
    console.log('\n5. Addition in sum');
    const query = 'data | summarize { count: count(), inflated_total: sum(price + 10) } by category | collect()';
    console.log(`   Query: ${query}`);
    
    const queryFunc = createQueryFunction(query);
    await queryFunc.execute(salesData);
}

async function runDemos() {
    try {
        await demo1();
        await demo2();
        await demo3();
        await demo4();
        await demo5();
        
        console.log('\n=== ✅ Success! Query Language with New Sum Working ===');
        console.log('✅ Basic sum expressions: sum(price * quantity)');
        console.log('✅ Simple field access: sum(price)');
        console.log('✅ GroupBy integration: by category');
        console.log('✅ Complex arithmetic: sum(price * quantity * 0.9)');
        console.log('✅ Addition expressions: sum(price + 10)');
        
    } catch (error) {
        console.error('Demo failed:', error);
    }
}

runDemos();