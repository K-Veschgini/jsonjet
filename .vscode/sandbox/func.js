const f1c = `
        function f(x) {
            return 2*x;
        }
        return f;
    `;

    const f2c = `
        function f(x) {
            return 3*x;
        }
        return f;
    `;

const f1 = new Function(f1c)();
const f2 = new Function(f2c)();

console.log(f1(2));
console.log(f2(2));
