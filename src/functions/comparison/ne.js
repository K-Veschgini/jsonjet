import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Not equal function: a != b
 */
export class Ne extends ScalarFunction {
    constructor() {
        super('ne');
    }
    
    _execute(args) {
        if (args.length !== 2) {
            throw new Error('ne function requires exactly 2 arguments');
        }
        return args[0] != args[1];
    }
}