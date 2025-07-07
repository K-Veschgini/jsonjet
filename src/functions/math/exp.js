/**
 * exp(x) - Mathematical exponential function (e^x)
 */

import { ScalarFunction } from '../core/scalar-function.js';
import { config } from '../core/function-config.js';

export class ExpFunction extends ScalarFunction {
    constructor() {
        super('exp');
    }
    
    /**
     * Calculate e^x
     * @param {Array} args - [x] where x is the exponent
     * @returns {number|null} e raised to the power of x, or null if invalid
     */
    _execute(args) {
        // Return null for wrong number of arguments
        if (args.length !== 1) {
            config.logFunctionWarning('exp', `Expected 1 argument, got ${args.length}`, args);
            return null;
        }
        
        const x = args[0];
        
        // Return null for anything that's not a number
        if (typeof x !== 'number') {
            config.logFunctionWarning('exp', `Expected number, got ${typeof x}`, x);
            return null;
        }
        
        // Calculate e^x
        return Math.exp(x);
    }
}