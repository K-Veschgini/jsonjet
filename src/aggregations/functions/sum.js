import { Aggregation } from '../core/aggregation.js';

/**
 * Production-ready Sum aggregation with multiple precision algorithms
 * 
 * Features:
 * - Kahan summation algorithm for better floating point precision
 * - Input validation and type coercion
 * - Overflow detection and handling
 * - Support for different precision strategies
 * - Comprehensive error handling
 */
export class Sum extends Aggregation {
    /**
     * @param {Object} options - Configuration options
     * @param {string} options.algorithm - 'kahan' (default), 'naive', 'pairwise'
     * @param {boolean} options.strict - Whether to throw on invalid inputs (default: false)
     * @param {boolean} options.detectOverflow - Whether to detect numeric overflow (default: true)
     * @param {number} options.maxSafeValue - Maximum safe value before overflow warning (default: Number.MAX_SAFE_INTEGER)
     */
    constructor(options = {}) {
        super();
        
        // Configuration
        this.algorithm = options.algorithm || 'kahan';
        this.strict = options.strict || false;
        this.detectOverflow = options.detectOverflow !== false; // default true
        this.maxSafeValue = options.maxSafeValue || Number.MAX_SAFE_INTEGER;
        
        // Kahan summation state
        this.sum = 0;           // Running sum
        this.compensation = 0;  // Compensation for lost low-order bits
        
        // Pairwise summation state
        this.values = [];       // For pairwise algorithm
        
        // Statistics
        this.count = 0;
        this.hasOverflowed = false;
        this.invalidInputCount = 0;
        
        // Validate algorithm choice
        if (!['kahan', 'naive', 'pairwise'].includes(this.algorithm)) {
            throw new Error(`Invalid algorithm: ${this.algorithm}. Must be 'kahan', 'naive', or 'pairwise'`);
        }
    }
    
    /**
     * Add a value to the sum
     * @param {*} value - Value to add (will be coerced to number if possible)
     */
    push(value) {
        const numValue = this._validateAndCoerce(value);
        if (numValue === null) return; // Skip invalid values
        
        this.count++;
        
        switch (this.algorithm) {
            case 'kahan':
                this._kahanAdd(numValue);
                break;
            case 'naive':
                this._naiveAdd(numValue);
                break;
            case 'pairwise':
                this._pairwiseAdd(numValue);
                break;
        }
        
        // Check for overflow
        if (this.detectOverflow && Math.abs(this.sum) > this.maxSafeValue) {
            this.hasOverflowed = true;
            if (this.strict) {
                throw new Error(`Sum overflow detected: ${this.sum} exceeds maximum safe value ${this.maxSafeValue}`);
            }
        }
    }
    
    /**
     * Kahan summation algorithm - compensated summation for better precision
     * @param {number} value 
     */
    _kahanAdd(value) {
        // Kahan summation algorithm
        const y = value - this.compensation;    // Subtract previous compensation
        const t = this.sum + y;                 // Temporary sum
        this.compensation = (t - this.sum) - y; // Calculate new compensation
        this.sum = t;                           // Update sum
    }
    
    /**
     * Naive summation - simple addition (for comparison/fallback)
     * @param {number} value 
     */
    _naiveAdd(value) {
        this.sum += value;
    }
    
    /**
     * Pairwise summation - store values and sum in pairs for better precision
     * @param {number} value 
     */
    _pairwiseAdd(value) {
        this.values.push(value);
    }
    
    /**
     * Validate input and coerce to number if possible
     * @param {*} value 
     * @returns {number|null} - Valid number or null if invalid
     */
    _validateAndCoerce(value) {
        // Handle null/undefined
        if (value === null || value === undefined) {
            this.invalidInputCount++;
            if (this.strict) {
                throw new Error(`Invalid input: ${value} is null or undefined`);
            }
            return null;
        }
        
        // Handle numbers (including NaN, Infinity)
        if (typeof value === 'number') {
            if (isNaN(value)) {
                this.invalidInputCount++;
                if (this.strict) {
                    throw new Error(`Invalid input: NaN is not allowed`);
                }
                return null;
            }
            
            if (!isFinite(value)) {
                if (this.strict) {
                    throw new Error(`Invalid input: ${value} is not finite`);
                }
                // Allow Infinity in non-strict mode
            }
            
            return value;
        }
        
        // Try to coerce strings to numbers
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '') {
                this.invalidInputCount++;
                if (this.strict) {
                    throw new Error(`Invalid input: empty string cannot be converted to number`);
                }
                return null;
            }
            
            const numValue = Number(trimmed);
            if (isNaN(numValue)) {
                this.invalidInputCount++;
                if (this.strict) {
                    throw new Error(`Invalid input: "${value}" cannot be converted to number`);
                }
                return null;
            }
            
            return numValue;
        }
        
        // Try to coerce other types
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }
        
        // For objects, try valueOf() then toString()
        if (typeof value === 'object') {
            try {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                    return numValue;
                }
            } catch (e) {
                // Fallback to strict behavior
            }
        }
        
        // Invalid input
        this.invalidInputCount++;
        if (this.strict) {
            throw new Error(`Invalid input: cannot convert ${typeof value} "${value}" to number`);
        }
        return null;
    }
    
    /**
     * Compute pairwise sum for better precision than naive summation
     * @param {number[]} values 
     * @returns {number}
     */
    _computePairwiseSum(values) {
        if (values.length === 0) return 0;
        if (values.length === 1) return values[0];
        if (values.length === 2) return values[0] + values[1];
        
        // Split array and recursively sum halves
        const mid = Math.floor(values.length / 2);
        const left = this._computePairwiseSum(values.slice(0, mid));
        const right = this._computePairwiseSum(values.slice(mid));
        return left + right;
    }
    
    /**
     * Get the final result
     * @returns {number} - The sum
     */
    getResult() {
        if (this.algorithm === 'pairwise') {
            return this._computePairwiseSum(this.values);
        }
        return this.sum;
    }
    
    /**
     * Get detailed statistics about the summation
     * @returns {Object} - Statistics object
     */
    getStats() {
        return {
            algorithm: this.algorithm,
            sum: this.getResult(),
            count: this.count,
            invalidInputCount: this.invalidInputCount,
            hasOverflowed: this.hasOverflowed,
            compensation: this.algorithm === 'kahan' ? this.compensation : undefined,
            precision: this.algorithm === 'kahan' ? 'high' : 
                      this.algorithm === 'pairwise' ? 'medium' : 'standard'
        };
    }
    
    /**
     * Reset the aggregation
     */
    reset() {
        this.sum = 0;
        this.compensation = 0;
        this.values = [];
        this.count = 0;
        this.hasOverflowed = false;
        this.invalidInputCount = 0;
    }
    
    /**
     * Create a copy of this Sum with the same configuration
     * @returns {Sum}
     */
    clone() {
        return new Sum({
            algorithm: this.algorithm,
            strict: this.strict,
            detectOverflow: this.detectOverflow,
            maxSafeValue: this.maxSafeValue
        });
    }
} 