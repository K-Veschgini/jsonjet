/**
 * JSDB Scalar Functions - Server Registry
 * Extends browser registry with server-only functions (Node.js dependencies)
 */

// Import browser registration function
import { registerFunctions } from './index.js';

// Server-only functions list (empty for now - add server functions here when needed)
const SERVER_ONLY_FUNCTIONS = [
  // Add server-only functions here when implemented
];

/**
 * Register server functions (browser-safe + server-only) to a registry instance
 * @param {Registry} registry - Registry instance to register functions to
 */
export function registerServerFunctions(registry) {
    // Register browser-safe functions first
    registerFunctions(registry);
    
    // Register server-only functions when available
    SERVER_ONLY_FUNCTIONS.forEach(FunctionClass => {
        registry.registerFunction(new FunctionClass());
    });
}

// Re-export browser registration function for convenience  
export { registerFunctions };
export { ScalarFunction } from './core/scalar-function.js';
export { Config, config } from './core/function-config.js';