/**
 * Emit function definitions for aggregation queries
 * Emit functions provide an alternative to windowing - they trigger output based on conditions
 * rather than data windows
 * 
 * Design Notes:
 * - Use callback functions for maximum flexibility
 * - Callbacks can extract any computed value from items
 * - emit_every assumes numeric input from callback (int or double)
 */

/**
 * Creates an emit function that triggers every N units of a computed value
 * The computed value callback is assumed to return a number (int or double)
 * @param {number} interval - Interval to use for triggering
 * @param {Function} valueCallback - Optional callback to extract monotonic value (if null uses count-based)
 * @returns {Object} Emit specification
 */
export function emit_every(interval, valueCallback = null) {
    return {
        _emitType: 'every',
        _interval: interval,
        _valueCallback: valueCallback,
        
        createEmitFunc() {
            let lastEmitValue = null;
            let itemCount = 0;
            
            return {
                // Check if we should emit for this item
                shouldEmit: (item) => {
                    let currentValue;
                    
                    if (!valueCallback) {
                        // Heuristic: small numbers are probably count-based, large numbers time-based
                        if (interval < 100) {
                            // Count-based for small intervals
                            itemCount++;
                            currentValue = itemCount;
                        } else {
                            // Time-based for large intervals
                            currentValue = Date.now();
                        }
                    } else {
                        // Handle string field names vs functions
                        if (typeof valueCallback === 'string') {
                            currentValue = item[valueCallback];
                        } else if (typeof valueCallback === 'function') {
                            currentValue = valueCallback(item);
                        } else {
                            throw new Error('valueExpr must be a field name (string), function, or null');
                        }
                        
                        // Validate that we got a number
                        if (typeof currentValue !== 'number') {
                            if (typeof valueCallback === 'string') {
                                throw new Error(`Field '${valueCallback}' must contain a number, got ${typeof currentValue}`);
                            } else {
                                throw new Error('Value expression must return a number');
                            }
                        }
                    }
                    
                    // Check if we should emit based on interval
                    if (lastEmitValue === null) {
                        lastEmitValue = currentValue;
                        return true; // Always emit first time
                    }
                    
                    if (currentValue - lastEmitValue >= interval) {
                        lastEmitValue = currentValue;
                        return true;
                    }
                    
                    return false;
                },
                
                // Force emit (used during flush)
                forceEmit: () => {
                    return true;
                },
                
                // Get emit info for results
                getEmitInfo: () => ({
                    type: !valueCallback && interval >= 100 ? 'interval' : 'every',
                    interval: interval,
                    valueCallback: valueCallback,
                    lastEmitValue: lastEmitValue,
                    itemCount: itemCount
                })
            };
        }
    };
}

/**
 * Creates an emit function that triggers when a condition is met
 * @param {Function} conditionCallback - Callback that returns boolean
 * @returns {Object} Emit specification
 */
export function emit_when(conditionCallback) {
    return {
        _emitType: 'when',
        _conditionCallback: conditionCallback,
        
        createEmitFunc() {
            return {
                // Check if we should emit for this item
                shouldEmit: (item) => {
                    // Handle different types of conditionCallback
                    let condition;
                    if (typeof conditionCallback === 'string') {
                        condition = item[conditionCallback];
                    } else if (typeof conditionCallback === 'function') {
                        condition = conditionCallback(item);
                    } else {
                        throw new Error('conditionExpr must be a field name (string) or function');
                    }
                    return Boolean(condition);
                },
                
                // Force emit (used during flush)
                forceEmit: () => {
                    return true;
                },
                
                // Get emit info for results
                getEmitInfo: () => ({
                    type: 'when',
                    conditionCallback: conditionCallback,
                    ...(typeof conditionCallback === 'function' && { conditionExpr: conditionCallback })
                })
            };
        }
    };
}

/**
 * Creates an emit function that triggers when a computed value changes
 * @param {Function} valueCallback - Callback to extract value for comparison
 * @returns {Object} Emit specification
 */
export function emit_on_change(valueCallback) {
    return {
        _emitType: 'change',
        _valueCallback: valueCallback,
        
        createEmitFunc() {
            let lastValue = Symbol('__no_value__'); // Unique symbol to detect first value
            
            return {
                // Check if we should emit for this item
                shouldEmit: (item) => {
                    // Handle different types of valueCallback
                    let currentValue;
                    if (typeof valueCallback === 'string') {
                        currentValue = item[valueCallback];
                    } else if (typeof valueCallback === 'function') {
                        currentValue = valueCallback(item);
                    } else {
                        throw new Error('emit_on_change requires a field name (string) or function');
                    }
                    
                    // Compare with last value
                    if (lastValue === Symbol('__no_value__') || lastValue !== currentValue) {
                        lastValue = currentValue;
                        return true;
                    }
                    
                    return false;
                },
                
                // Force emit (used during flush)
                forceEmit: () => {
                    return true;
                },
                
                // Get emit info for results
                getEmitInfo: () => ({
                    type: 'change',
                    valueCallback: valueCallback,
                    lastValue: lastValue
                })
            };
        }
    };
}

/**
 * Creates an emit function that triggers when any field in the group key changes
 * This is useful for group-by operations where you want to emit when switching groups
 * @returns {Object} Emit specification
 */
export function emit_on_group_change() {
    return {
        _emitType: 'group_change',
        
        createEmitFunc() {
            let lastGroupKey = Symbol('__no_group__');
            
            return {
                // Check if we should emit for this item (requires group key)
                shouldEmit: (item, groupKey) => {
                    if (lastGroupKey === Symbol('__no_group__') || lastGroupKey !== groupKey) {
                        lastGroupKey = groupKey;
                        return true;
                    }
                    
                    return false;
                },
                
                // Force emit (used during flush)
                forceEmit: () => {
                    return true;
                },
                
                // Get emit info for results
                getEmitInfo: () => ({
                    type: 'group_change',
                    lastGroupKey: lastGroupKey
                })
            };
        }
    };
}

/**
 * Creates an emit function that triggers when aggregation values are updated
 * This requires cooperation from the SummarizeOperator to check if values actually changed
 * @returns {Object} Emit specification
 */
export function emit_on_update() {
    return {
        _emitType: 'update',
        
        createEmitFunc() {
            return {
                // Check if we should emit for this item (requires aggregation change info)
                shouldEmit: (item, groupKey, hasAggregationChanged) => {
                    return Boolean(hasAggregationChanged);
                },
                
                // Force emit (used during flush)
                forceEmit: () => {
                    return true;
                },
                
                // Get emit info for results
                getEmitInfo: () => ({
                    type: 'update'
                })
            };
        }
    };
}

// Legacy functions for backward compatibility (deprecated)
export function emit_every_count(count) {
    console.warn('emit_every_count is deprecated. Use emit_every(count) instead.');
    return {
        _emitType: 'every_count',
        _count: count,
        
        createEmitFunc() {
            let itemCount = 0;
            
            return {
                shouldEmit: (item) => {
                    itemCount++;
                    return itemCount % count === 0;
                },
                
                forceEmit: () => {
                    return true;
                },
                
                getEmitInfo: () => ({
                    type: 'count',
                    count: count,
                    interval: count,
                    itemCount: itemCount
                })
            };
        }
    };
}

export function emit_every_interval(interval) {
    console.warn('emit_every_interval is deprecated. Use emit_every(interval, (item) => Date.now()) instead.');
    return emit_every(interval, () => Date.now());
}

/**
 * Registry of emit functions
 */
export const EMIT_FUNCTIONS = {
    emit_every,
    emit_when,
    emit_on_change,
    emit_on_group_change,
    emit_on_update,
    // Legacy
    emit_every_count,
    emit_every_interval
};