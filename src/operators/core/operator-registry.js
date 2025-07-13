/**
 * Registry for stream operators
 */
export class OperatorRegistry {
    constructor() {
        this.operators = new Map(); // name -> operator class
    }
    
    /**
     * Register an operator class
     * @param {string} name - Operator name
     * @param {class} OperatorClass - Operator class constructor
     */
    register(name, OperatorClass) {
        this.operators.set(name.toLowerCase(), OperatorClass);
    }
    
    /**
     * Create a new operator instance
     * @param {string} name - Operator name
     * @param {...any} args - Constructor arguments
     * @returns {Operator} New operator instance
     */
    create(name, ...args) {
        const OperatorClass = this.operators.get(name.toLowerCase());
        if (!OperatorClass) {
            throw new Error(`Unknown operator: ${name}`);
        }
        return new OperatorClass(...args);
    }
    
    /**
     * Check if operator exists
     * @param {string} name - Operator name
     * @returns {boolean}
     */
    has(name) {
        return this.operators.has(name.toLowerCase());
    }
    
    /**
     * Get operator class
     * @param {string} name - Operator name
     * @returns {class|null} Operator class or null if not found
     */
    get(name) {
        return this.operators.get(name.toLowerCase()) || null;
    }
    
    /**
     * Get all registered operator names
     * @returns {string[]}
     */
    getNames() {
        return Array.from(this.operators.keys());
    }
}

// Export singleton instance
export const operatorRegistry = new OperatorRegistry();