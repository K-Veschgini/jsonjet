import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Logical NOT function: !a
 */
export class Not extends ScalarFunction {
    constructor() {
        super('not');
    }
    
    _execute(args) {
        if (args.length !== 1) {
            throw new Error('not function requires exactly 1 argument');
        }
        return !args[0];
    }
}