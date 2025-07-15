import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Division function: a / b / c / ...
 */
export class Div extends ScalarFunction {
    constructor() {
        super('div');
    }
    
    _execute(args) {
        if (args.length === 0) return 1;
        if (args.length === 1) return args[0];
        return args.reduce((result, val, index) => index === 0 ? val : result / val);
    }
}