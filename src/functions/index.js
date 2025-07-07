/**
 * JSDB Scalar Functions
 * Central exports and registration
 */

export { ScalarFunction } from './core/scalar-function.js';
export { FunctionRegistry, functionRegistry } from './core/function-registry.js';

// Math functions
export { ExpFunction } from './math/index.js';

// Register all functions
import { ExpFunction } from './math/index.js';

// Auto-register all functions on import
functionRegistry.register(new ExpFunction());