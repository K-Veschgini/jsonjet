import { QueryLexer } from './src/parser/query-parser.js';

// Test just the lexing first to see if tokens are recognized correctly
const testInput = 'select { name: name }';

console.log('Testing lexer with:', testInput);

const lexResult = QueryLexer.tokenize(testInput);

if (lexResult.errors.length > 0) {
    console.log('❌ Lexing errors:');
    lexResult.errors.forEach(error => {
        console.log('  -', error.message);
    });
} else {
    console.log('✅ Lexing successful');
}

console.log('\nTokens:');
lexResult.tokens.forEach((token, i) => {
    console.log(`${i}: ${token.tokenType.name} = "${token.image}"`);
});

// Now test parsing
console.log('\n=== Testing Parse ===');
import { parseQuery } from './src/parser/query-parser.js';

try {
    const parseResult = parseQuery(testInput);
    console.log('✅ Parsing successful');
    
    if (parseResult.parseErrors.length > 0) {
        console.log('Parse errors:');
        parseResult.parseErrors.forEach(error => {
            console.log('  -', error.message);
        });
    }
} catch (error) {
    console.log('❌ Parsing failed:', error.message);
}