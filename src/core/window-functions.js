/**
 * Window function definitions for aggregation queries
 * All window functions return arrays of windows that a document belongs to
 * Each window has a unique _id field for efficient comparison
 * 
 * Design Notes:
 * - Use callback functions for maximum flexibility
 * - Distinct count-based and value-based function signatures (no optional parameters)
 * - Callbacks can extract any computed value from items
 */

/**
 * Creates a tumbling window (non-overlapping windows)
 * @param {number} size - Window size (count or value units)
 * @param {string|Function} valueExpr - Optional field name or callback to extract value
 * @returns {Function} Window function
 */
export function tumbling_window(size, valueExpr = null) {
    return {
        _windowType: 'tumbling',
        _mode: valueExpr ? 'value' : 'count',
        _size: size,
        _valueExpr: valueExpr,
        
        createWindowFunc() {
            let itemCount = 0;
            
            return (item) => {
                if (!valueExpr) {
                    // Count-based mode
                    const windowId = Math.floor(itemCount / size);
                    const windowStart = windowId * size;
                    itemCount++;
                    
                    return [{
                        _id: windowId,
                        windowId: windowId,
                        start: windowStart,
                        end: windowStart + size,
                        type: 'tumbling',
                        mode: 'count',
                        size: size
                    }];
                } else {
                    // Value-based mode
                    let value;
                    if (typeof valueExpr === 'string') {
                        // Support nested field access like 'payload.ts'
                        const parts = valueExpr.split('.');
                        value = item;
                        for (const part of parts) {
                            value = value?.[part];
                        }
                    } else if (typeof valueExpr === 'function') {
                        value = valueExpr(item);
                    } else {
                        throw new Error('valueExpr must be a string (field name) or function');
                    }
                    
                    if (typeof value !== 'number') {
                        throw new Error('Value expression must return a number');
                    }
                    
                    const windowId = Math.floor(value / size) * size;
                    const windowStart = windowId;
                    
                    return [{
                        _id: windowId,
                        windowId: windowId,
                        start: windowStart,
                        end: windowStart + size,
                        type: 'tumbling',
                        mode: 'value',
                        size: size
                    }];
                }
            };
        }
    };
}

/**
 * Creates a value-based tumbling window (non-overlapping windows of fixed value range)
 * @param {number} size - Window size in value units
 * @param {Function} valueCallback - Callback to extract value from items
 * @returns {Function} Window function
 */
export function tumbling_window_by(size, valueCallback) {
    return {
        _windowType: 'tumbling',
        _mode: 'value',
        _size: size,
        _valueCallback: valueCallback,
        
        createWindowFunc() {
            return (item) => {
                const value = valueCallback(item);
                const windowStart = Math.floor(value / size) * size;
                return [{
                    _id: windowStart,
                    windowId: windowStart,
                    start: windowStart,
                    end: windowStart + size,
                    type: 'tumbling',
                    mode: 'value',
                    size: size
                }];
            };
        }
    };
}

/**
 * Creates a hopping window (overlapping windows)
 * @param {number} size - Window size (count or value units)
 * @param {number} hop - How much to advance the window each time
 * @param {string|Function} valueExpr - Optional field name or callback to extract value
 * @returns {Function} Window function
 */
export function hopping_window(size, hop, valueExpr = null) {
    return {
        _windowType: 'hopping',
        _mode: valueExpr ? 'value' : 'count',
        _size: size,
        _hop: hop,
        _valueExpr: valueExpr,
        
        createWindowFunc() {
            let itemCount = 0;
            
            return (item) => {
                if (!valueExpr) {
                    // Count-based mode
                    const windows = [];
                    const firstWindowId = Math.max(0, Math.floor((itemCount - size + hop) / hop));
                    const lastWindowId = Math.floor(itemCount / hop);
                    
                    for (let windowId = firstWindowId; windowId <= lastWindowId; windowId++) {
                        const windowStart = windowId * hop;
                        if (windowStart <= itemCount && itemCount < windowStart + size) {
                            windows.push({
                                _id: windowId,
                                windowId: windowId,
                                start: windowStart,
                                end: windowStart + size,
                                type: 'hopping',
                                mode: 'count',
                                size: size,
                                hop: hop
                            });
                        }
                    }
                    
                    itemCount++;
                    return windows;
                } else {
                    // Value-based mode
                    let value;
                    if (typeof valueExpr === 'string') {
                        // Support nested field access like 'payload.ts'
                        const parts = valueExpr.split('.');
                        value = item;
                        for (const part of parts) {
                            value = value?.[part];
                        }
                    } else if (typeof valueExpr === 'function') {
                        value = valueExpr(item);
                    } else {
                        throw new Error('valueExpr must be a string (field name) or function');
                    }
                    
                    if (typeof value !== 'number') {
                        throw new Error('Value expression must return a number');
                    }
                    
                    const windows = [];
                    const firstWindowStart = Math.floor((value - size + hop) / hop) * hop;
                    const lastWindowStart = Math.floor(value / hop) * hop;
                    
                    for (let windowStart = Math.max(0, firstWindowStart); windowStart <= lastWindowStart; windowStart += hop) {
                        if (windowStart <= value && value < windowStart + size) {
                            windows.push({
                                _id: windowStart,
                                windowId: windowStart,
                                start: windowStart,
                                end: windowStart + size,
                                type: 'hopping',
                                mode: 'value',
                                size: size,
                                hop: hop
                            });
                        }
                    }
                    
                    return windows;
                }
            };
        }
    };
}

/**
 * Creates a value-based hopping window (overlapping windows with fixed value ranges)
 * @param {number} size - Window size in value units
 * @param {number} hop - How much to advance the window each time
 * @param {Function} valueCallback - Callback to extract value from items
 * @returns {Function} Window function
 */
export function hopping_window_by(size, hop, valueCallback) {
    return {
        _windowType: 'hopping',
        _mode: 'value',
        _size: size,
        _hop: hop,
        _valueCallback: valueCallback,
        
        createWindowFunc() {
            return (item) => {
                const value = valueCallback(item);
                const windows = [];
                
                // Find all windows this value belongs to
                const firstWindowStart = Math.floor((value - size + hop) / hop) * hop;
                const lastWindowStart = Math.floor(value / hop) * hop;
                
                for (let windowStart = firstWindowStart; windowStart <= lastWindowStart; windowStart += hop) {
                    if (windowStart <= value && value < windowStart + size) {
                        windows.push({
                            _id: windowStart,
                            windowId: windowStart,
                            start: windowStart,
                            end: windowStart + size,
                            type: 'hopping',
                            mode: 'value',
                            size: size,
                            hop: hop
                        });
                    }
                }
                
                return windows;
            };
        }
    };
}

/**
 * Creates a sliding window (moves with each new item)
 * @param {number} size - Window size (count or value units)
 * @param {string|Function} valueExpr - Optional field name or callback to extract value
 * @returns {Function} Window function
 */
export function sliding_window(size, valueExpr = null) {
    return {
        _windowType: 'sliding',
        _mode: valueExpr ? 'value' : 'count',
        _size: size,
        _valueExpr: valueExpr,
        
        createWindowFunc() {
            let itemCount = 0;
            
            return (item) => {
                if (!valueExpr) {
                    // Count-based mode
                    const windowStart = Math.max(0, itemCount - size + 1);
                    const currentCount = itemCount;
                    itemCount++;
                    
                    return [{
                        _id: currentCount,
                        windowId: currentCount,
                        start: windowStart,
                        end: currentCount + 1,
                        type: 'sliding',
                        mode: 'count',
                        size: size
                    }];
                } else {
                    // Value-based mode
                    let value;
                    if (typeof valueExpr === 'string') {
                        // Support nested field access like 'payload.ts'
                        const parts = valueExpr.split('.');
                        value = item;
                        for (const part of parts) {
                            value = value?.[part];
                        }
                    } else if (typeof valueExpr === 'function') {
                        value = valueExpr(item);
                    } else {
                        throw new Error('valueExpr must be a string (field name) or function');
                    }
                    
                    if (typeof value !== 'number') {
                        throw new Error('Value expression must return a number');
                    }
                    
                    const windowEnd = value + 1;
                    const windowStart = windowEnd - size;
                    
                    return [{
                        _id: value,
                        windowId: value,
                        start: windowStart,
                        end: windowEnd,
                        type: 'sliding',
                        mode: 'value',
                        size: size
                    }];
                }
            };
        }
    };
}

/**
 * Creates a value-based sliding window (moves with each new value)
 * @param {number} size - Window size in value units
 * @param {Function} valueCallback - Callback to extract value from items
 * @returns {Function} Window function
 */
export function sliding_window_by(size, valueCallback) {
    return {
        _windowType: 'sliding',
        _mode: 'value',
        _size: size,
        _valueCallback: valueCallback,
        
        createWindowFunc() {
            return (item) => {
                const value = valueCallback(item);
                const windowStart = value - size + 1;
                return [{
                    _id: value,
                    windowId: value,
                    start: windowStart,
                    end: value + 1,
                    type: 'sliding',
                    mode: 'value',
                    size: size
                }];
            };
        }
    };
}

/**
 * Creates a session window (groups items by inactivity gaps)
 * Always value-based since sessions require temporal/value comparison
 * @param {number} timeout - Maximum gap between items in same session
 * @param {Function} valueCallback - Callback to extract timestamp/value
 * @returns {Function} Window function
 */
export function session_window(timeout, valueCallback) {
    if (!valueCallback) {
        throw new Error('Session windows require a valueExpr parameter');
    }
    
    return {
        _windowType: 'session',
        _mode: 'value',
        _timeout: timeout,
        _valueCallback: valueCallback,
        
        createWindowFunc() {
            let lastValue = null;
            let sessionId = 0;
            let sessionStart = null;
            
            return (item) => {
                let value;
                if (typeof valueCallback === 'string') {
                    // Support nested field access like 'payload.ts'
                    const parts = valueCallback.split('.');
                    value = item;
                    for (const part of parts) {
                        value = value?.[part];
                    }
                } else if (typeof valueCallback === 'function') {
                    value = valueCallback(item);
                } else {
                    throw new Error('valueCallback must be a string field name or function');
                }
                
                if (typeof value !== 'number') {
                    throw new Error('Value expression must return a number');
                }
                
                if (lastValue === null || (value - lastValue) > timeout) {
                    sessionId++;
                    sessionStart = value;
                }
                
                lastValue = value;
                return [{
                    _id: sessionId,
                    windowId: sessionId,
                    start: sessionStart,
                    end: value + timeout,
                    type: 'session',
                    mode: 'value',
                    timeout: timeout
                }];
            };
        }
    };
}

/**
 * Creates a count window (triggers every N items)
 * Always count-based by definition
 * @param {number} count - Number of items per window
 * @returns {Function} Window function
 */
export function count_window(count) {
    return {
        _windowType: 'count',
        _mode: 'count',
        _count: count,
        
        createWindowFunc() {
            let itemCount = 0;
            
            return (item) => {
                const windowId = Math.floor(itemCount / count);
                const windowStart = windowId * count;
                itemCount++;
                
                return [{
                    _id: windowId,
                    windowId: windowId,
                    start: windowStart,
                    end: windowStart + count,
                    type: 'count',
                    mode: 'count',
                    count: count
                }];
            };
        }
    };
}

/**
 * Registry of window functions
 */
export const WINDOW_FUNCTIONS = {
    // Count-based
    tumbling_window,
    hopping_window,
    sliding_window,
    count_window,
    
    // Value-based  
    tumbling_window_by,
    hopping_window_by,
    sliding_window_by,
    session_window
};