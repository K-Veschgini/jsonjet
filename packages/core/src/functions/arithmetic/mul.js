import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Multiplication function: a * b * c * ...
 */
export class Mul extends ScalarFunction {
    constructor() {
        super('mul');
    }
    
    _execute(args) {
        if (args.length === 0) return 1;
        return args.reduce((product, val) => product * val, 1);
    }
}