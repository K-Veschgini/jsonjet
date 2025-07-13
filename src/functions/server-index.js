/**
 * JSDB Scalar Functions - Server Registry
 * Extends browser registry with server-only functions (Node.js dependencies)
 */

// Import browser registry first (gets all browser-safe functions)
import { functionRegistry } from './index.js';

// Server-only functions list (empty for now - add server functions here when needed)
const SERVER_ONLY_FUNCTIONS = [
  // Add server-only functions here when implemented
];

// Register server-only functions to existing registry
SERVER_ONLY_FUNCTIONS.forEach(FunctionClass => {
  functionRegistry.register(new FunctionClass());
});

// Re-export the enhanced registry
export { functionRegistry };
export { ScalarFunction } from './core/scalar-function.js';
export { FunctionRegistry } from './core/function-registry.js';
export { Config, config } from './core/function-config.js';