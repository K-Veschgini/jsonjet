import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Greater than function: a > b
 */
export class Gt extends ScalarFunction {
    constructor() {
        super('gt');
    }
    
    _execute(args) {
        if (args.length !== 2) {
            throw new Error('gt function requires exactly 2 arguments');
        }
        return args[0] > args[1];
    }
}