/**
 * JSON Sanitizer - Removes undefined values from objects before JSON serialization
 * Converts undefined to null or removes the property entirely
 */

/**
 * Sanitize an object by removing all undefined values
 * @param {any} obj - The object to sanitize
 * @param {object} options - Sanitization options
 * @param {boolean} options.removeUndefined - If true, removes undefined properties. If false, converts to null
 * @param {boolean} options.deep - If true, recursively sanitizes nested objects and arrays
 * @returns {any} Sanitized object safe for JSON serialization
 */
export function sanitizeForJSON(obj, options = { removeUndefined: true, deep: true }) {
    if (obj === undefined) {
        return options.removeUndefined ? undefined : null;
    }
    
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        const result = obj.map(item => 
            options.deep ? sanitizeForJSON(item, options) : item
        );
        
        // Remove undefined elements from arrays if requested
        return options.removeUndefined ? 
            result.filter(item => item !== undefined) : 
            result.map(item => item === undefined ? null : item);
    }
    
    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
        const sanitizedValue = options.deep ? sanitizeForJSON(value, options) : value;
        
        if (sanitizedValue === undefined) {
            if (!options.removeUndefined) {
                result[key] = null;
            }
            // If removeUndefined is true, skip adding this property
        } else {
            result[key] = sanitizedValue;
        }
    }
    
    return result;
}

/**
 * Safe JSON stringify that handles undefined values
 * @param {any} obj - Object to stringify
 * @param {object} options - Sanitization options
 * @returns {string} JSON string with no undefined values
 */
export function safeJSONStringify(obj, options = { removeUndefined: true, deep: true }) {
    const sanitized = sanitizeForJSON(obj, options);
    return JSON.stringify(sanitized);
}

/**
 * Replacer function for JSON.stringify that handles undefined
 * Can be used directly with JSON.stringify(obj, undefinedReplacer)
 */
export function undefinedReplacer(key, value) {
    return value === undefined ? null : value;
}

/**
 * Alternative replacer that removes undefined properties entirely
 */
export function undefinedRemover(key, value) {
    return value === undefined ? undefined : value;
}

export default { sanitizeForJSON, safeJSONStringify, undefinedReplacer, undefinedRemover };