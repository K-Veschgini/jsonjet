import { parseQuery } from '../src/parser/query-parser.js';

const queries = [
    'data | summarize { count: count() } | collect()',
    'data | summarize { total: sum(price) } | collect()',
    'data | summarize { count: count(), total: sum(price) } | collect()'
];

queries.forEach((query, i) => {
    console.log(`\nQuery ${i + 1}: ${query}`);
    try {
        const result = parseQuery(query);
        console.log('✅ Parsed successfully');
        if (result.parseErrors.length > 0) {
            console.log('Parse errors:', result.parseErrors.map(e => e.message));
        }
    } catch (error) {
        console.log('❌ Parse failed:', error.message);
    }
});