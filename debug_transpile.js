import { transpileQuery } from './src/parser/query-transpiler.js';

const query = `input | scan(step s1: true => emit({ ...*, extra: "added" });) | insert_into(output)`;

console.log('Query:', query);
console.log('');

try {
    const result = transpileQuery(query);
    console.log('Success!');
    console.log('JavaScript:', result.javascript);
} catch (error) {
    console.log('Error:', error.message);
    if (error.message.includes('Parsing errors')) {
        // Try to parse just the scan part
        const scanOnly = `input | scan(step s1: true => emit({ ...*, extra: "added" });)`;
        console.log('Trying scan only:', scanOnly);
        try {
            const scanResult = transpileQuery(scanOnly);
            console.log('Scan Success!');
            console.log('JavaScript:', scanResult.javascript);
        } catch (scanError) {
            console.log('Scan Error:', scanError.message);
        }
    }
}