import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Pi function: returns Math.PI
 */
export class PiFunction extends ScalarFunction {
    constructor() {
        super('pi');
    }
    
    _execute(args) {
        if (args.length !== 0) {
            throw new Error('pi function requires exactly 0 arguments');
        }
        return Math.PI;
    }
} 