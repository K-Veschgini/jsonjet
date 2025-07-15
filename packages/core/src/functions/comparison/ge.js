import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Greater than or equal function: a >= b
 */
export class Ge extends ScalarFunction {
    constructor() {
        super('ge');
    }
    
    _execute(args) {
        if (args.length !== 2) {
            throw new Error('ge function requires exactly 2 arguments');
        }
        return args[0] >= args[1];
    }
}