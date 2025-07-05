/**
 * Window function definitions for aggregation queries
 */
import { safeGet } from '../utils/safe-access.js';

/**
 * Creates a hopping window that moves forward by a fixed interval
 * @param {number} size - Window size in time units or number of items
 * @param {number} hop - How much to advance the window each time
 * @param {string} timeField - Field name containing timestamp (optional)
 * @returns {Function} Window function
 */
export function hopping_window(size, hop, timeField = null) {
    return {
        _windowType: 'hopping',
        _size: size,
        _hop: hop,
        _timeField: timeField,
        
        // Create the actual window function
        createWindowFunc() {
            if (timeField) {
                // Time-based windowing
                return (item) => {
                    const timestamp = safeGet(item, timeField);
                    if (typeof timestamp === 'number') {
                        const windowStart = Math.floor(timestamp / hop) * hop;
                        return {
                            windowId: windowStart,
                            start: windowStart,
                            end: windowStart + size,
                            type: 'hopping',
                            size: size,
                            hop: hop
                        };
                    }
                    throw new Error(`Invalid timestamp in field ${timeField}`);
                };
            } else {
                // Count-based windowing
                let itemCount = 0;
                return (item) => {
                    const windowId = Math.floor(itemCount / hop);
                    const windowStart = windowId * hop;
                    itemCount++;
                    return {
                        windowId: windowId,
                        start: windowStart,
                        end: windowStart + size,
                        type: 'hopping',
                        size: size,
                        hop: hop
                    };
                };
            }
        }
    };
}

/**
 * Creates a tumbling window (non-overlapping windows)
 * @param {number} size - Window size
 * @param {string} timeField - Field name containing timestamp (optional)
 * @returns {Function} Window function
 */
export function tumbling_window(size, timeField = null) {
    return hopping_window(size, size, timeField);
}

/**
 * Creates a session window that groups items by inactivity gaps
 * @param {number} timeout - Maximum time between items in same session
 * @param {string} timeField - Field name containing timestamp
 * @returns {Function} Window function
 */
export function session_window(timeout, timeField) {
    return {
        _windowType: 'session',
        _timeout: timeout,
        _timeField: timeField,
        
        createWindowFunc() {
            let lastTimestamp = null;
            let sessionId = 0;
            let sessionStart = null;
            
            return (item) => {
                const timestamp = safeGet(item, timeField);
                if (typeof timestamp !== 'number') {
                    throw new Error(`Invalid timestamp in field ${timeField}`);
                }
                
                if (lastTimestamp === null || (timestamp - lastTimestamp) > timeout) {
                    sessionId++;
                    sessionStart = timestamp;
                }
                
                lastTimestamp = timestamp;
                return {
                    windowId: sessionId,
                    start: sessionStart,
                    end: timestamp + timeout, // Estimated end based on timeout
                    type: 'session',
                    timeout: timeout
                };
            };
        }
    };
}

/**
 * Registry of window functions
 */
export const WINDOW_FUNCTIONS = {
    hopping_window,
    tumbling_window,
    session_window
}; 