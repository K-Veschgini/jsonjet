import { extractExternalFunctionCalls } from './src/index.js';

function runTest(name, code, expected) {
    try {
        const result = extractExternalFunctionCalls(code);
        const passed = JSON.stringify(result.sort()) === JSON.stringify(expected.sort());
        console.log(`${passed ? '✅' : '❌'} ${name}`);
        if (!passed) {
            console.log(`  Expected: ${JSON.stringify(expected)}`);
            console.log(`  Got:      ${JSON.stringify(result)}`);
        }
        return passed;
    } catch (error) {
        console.log(`❌ ${name} - Error: ${error.message}`);
        return false;
    }
}

console.log('Testing Code Analyzer\n');

const tests = [
    {
        name: 'Simple function calls',
        code: 'f(); g(); h();',
        expected: ['f', 'g', 'h']
    },
    {
        name: 'Nested function calls',
        code: 'f(() => g(() => h()));',
        expected: ['f', 'g', 'h']
    },
    {
        name: 'Method calls',
        code: 'obj.method(); arr.map(x => x);',
        expected: ['method', 'map']
    },
    {
        name: 'Defined functions should be excluded',
        code: `
            function myFunc() { return 42; }
            const arrowFunc = () => {};
            myFunc();
            arrowFunc();
            externalFunc();
        `,
        expected: ['externalFunc']
    },
    {
        name: 'Complex nested structure',
        code: `
            function inner() { return 'inner'; }
            const result = process(data.map(item => {
                return transform(item.filter(x => x > 0));
            }));
        `,
        expected: ['process', 'map', 'filter', 'transform']
    },
    {
        name: 'Object method calls',
        code: 'utils.format(); logger.info();',
        expected: ['format', 'info']
    },
    {
        name: 'Computed property calls - security risk',
        code: "obj['method'](); arr['filter'](x => x > 0);",
        expected: ['[DYNAMIC_CALL]']
    },
    {
        name: 'Dynamic property access - high security risk',
        code: "obj[getMethodName()](); arr[someVar]();",
        expected: ['[DYNAMIC_CALL]', 'getMethodName']
    }
];

let passed = 0;
let total = tests.length;

tests.forEach(test => {
    if (runTest(test.name, test.code, test.expected)) {
        passed++;
    }
});

console.log(`\n${passed}/${total} tests passed`);
process.exit(passed === total ? 0 : 1); 