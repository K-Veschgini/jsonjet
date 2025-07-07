/**
 * Global configuration for JSDB
 */

export class Config {
    constructor() {
        this.logFunctionWarnings = false;
    }
    
    /**
     * Set a configuration flag
     * @param {string} key - Configuration key
     * @param {any} value - Configuration value
     */
    set(key, value) {
        this[key] = value;
    }
    
    /**
     * Get a configuration flag
     * @param {string} key - Configuration key
     * @returns {any} Configuration value
     */
    get(key) {
        return this[key];
    }
    
    /**
     * Log a function warning if logging is enabled
     * @param {string} functionName - Name of the function
     * @param {string} message - Warning message
     * @param {any} value - The problematic value (optional)
     */
    logFunctionWarning(functionName, message, value = undefined) {
        if (this.logFunctionWarnings) {
            const logMessage = value !== undefined 
                ? `Function '${functionName}': ${message} (value: ${JSON.stringify(value)})`
                : `Function '${functionName}': ${message}`;
            console.warn(`[JSDB] ${logMessage}`);
        }
    }
}

// Global config instance
export const config = new Config();