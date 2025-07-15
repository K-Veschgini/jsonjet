import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Subtraction function: a - b - c - ...
 */
export class Sub extends ScalarFunction {
    constructor() {
        super('sub');
    }
    
    _execute(args) {
        if (args.length === 0) return 0;
        if (args.length === 1) return args[0];
        return args.reduce((result, val, index) => index === 0 ? val : result - val);
    }
}