/**
 * Safely access nested properties in objects without throwing errors
 * Handles null, undefined, and missing properties gracefully
 * 
 * @param {Object} obj - The object to access properties from
 * @param {string} path - Dot-separated path like 'user.address.street.name'
 * @returns {*} The value at the path, or undefined if any part is missing/null
 */
export function safeGet(obj, path) {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }
  
  if (!path || typeof path !== 'string') {
    return undefined;
  }
  
  // Handle simple property access (no dots)
  if (!path.includes('.')) {
    return obj[path];
  }
  
  // Handle nested property access
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    if (typeof current !== 'object') {
      return undefined;
    }
    
    current = current[part];
  }
  
  return current;
}

/**
 * Safely set a nested property in an object
 * Creates intermediate objects if they don't exist
 * 
 * @param {Object} obj - The object to set properties on
 * @param {string} path - Dot-separated path like 'user.address.street.name'
 * @param {*} value - The value to set
 * @returns {Object} The original object (for chaining)
 */
export function safeSet(obj, path, value) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (!path || typeof path !== 'string') {
    return obj;
  }
  
  // Handle simple property access (no dots)
  if (!path.includes('.')) {
    obj[path] = value;
    return obj;
  }
  
  // Handle nested property access
  const parts = path.split('.');
  let current = obj;
  
  // Navigate to the parent of the target property
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    
    if (current[part] === null || current[part] === undefined) {
      current[part] = {};
    } else if (typeof current[part] !== 'object') {
      // Can't set nested property on non-object
      return obj;
    }
    
    current = current[part];
  }
  
  // Set the final property
  current[parts[parts.length - 1]] = value;
  return obj;
}

/**
 * Check if a nested property exists (not null or undefined)
 * 
 * @param {Object} obj - The object to check
 * @param {string} path - Dot-separated path like 'user.address.street.name'
 * @returns {boolean} True if the property exists and is not null/undefined
 */
export function safeHas(obj, path) {
  const value = safeGet(obj, path);
  return value !== undefined && value !== null;
}