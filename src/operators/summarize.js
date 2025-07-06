import { Operator } from '../core/operator.js';
import { AggregationObject } from '../aggregations/core/aggregation-object.js';

/**
 * Summarize operator that supports multiple modes:
 * 1. No window, no emit: summarize {key: count(), total: sum("field") } by groupByCallback
 * 2. Window mode: summarize {key: count(), total: sum("field") } by groupByCallback over variableName = hopping_window(...)
 * 3. Emit mode: summarize {key: count(), total: sum("field") } by groupByCallback emit every 1000
 */
export class SummarizeOperator extends Operator {
    constructor(aggregationSpec, groupByCallback = null, windowSpec = null, emitSpec = null, windowVariableName = 'window') {
        super();
        this.aggregationSpec = aggregationSpec;
        this.groupByCallback = groupByCallback;
        this.windowSpec = windowSpec;
        this.emitSpec = emitSpec;
        this.windowVariableName = windowVariableName; // User-defined variable name for window
        
        // Validate that window and emit are mutually exclusive
        if (this.windowSpec && this.emitSpec) {
            throw new Error('Cannot use both window and emit specifications - they are mutually exclusive');
        }
        
        // Runtime state
        this.activeWindows = new Map(); // windowId -> { windowInfo, groups }
        this.windowFunc = null;
        this.emitFunc = null;
        this.noWindowGroups = new Map(); // For no-window mode: groupKey -> { aggregation, groupValue }
        this.processQueue = Promise.resolve(); // Serialize processing
        
        this.initializeWindowAndEmit();
    }
    
    /**
     * Initialize the window or emit function
     */
    initializeWindowAndEmit() {
        if (this.windowSpec && this.windowSpec.createWindowFunc) {
            this.windowFunc = this.windowSpec.createWindowFunc();
        }
        
        if (this.emitSpec && this.emitSpec.createEmitFunc) {
            this.emitFunc = this.emitSpec.createEmitFunc();
        }
        
        this.activeWindows.clear();
        this.noWindowGroups.clear();
    }
    
    /**
     * Generate a group key from groupBy callback
     */
    generateGroupKey(item, context = {}) {
        if (!this.groupByCallback) {
            return '__default__';
        }
        
        const groupValue = this.groupByCallback(item, context);
        return this.serializeGroupKey(groupValue);
    }
    
    /**
     * Serialize group key with deep equality support for complex objects
     */
    serializeGroupKey(value) {
        if (value === null || value === undefined) {
            return JSON.stringify(value);
        }
        
        if (typeof value === 'object') {
            // Sort keys for consistent serialization of objects
            const sortedObj = this.sortObjectKeys(value);
            return JSON.stringify(sortedObj);
        }
        
        return JSON.stringify(value);
    }
    
    /**
     * Recursively sort object keys for consistent serialization
     */
    sortObjectKeys(obj) {
        if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.sortObjectKeys(item));
        }
        
        const sorted = {};
        Object.keys(obj).sort().forEach(key => {
            sorted[key] = this.sortObjectKeys(obj[key]);
        });
        
        return sorted;
    }
    
    /**
     * Process an incoming item (serialized to prevent race conditions)
     */
    async process(doc) {
        // Serialize processing to prevent race conditions with window state
        this.processQueue = this.processQueue.then(async () => {
            await this.processItem(doc);
        });
        return this.processQueue;
    }
    
    /**
     * Internal processing method
     */
    async processItem(doc) {
        if (this.windowFunc) {
            // Window mode
            await this.processWithWindows(doc);
        } else if (this.emitFunc) {
            // Emit mode
            await this.processWithEmit(doc);
        } else {
            // No window, no emit - accumulate until flush
            await this.processWithoutWindow(doc);
        }
    }
    
    /**
     * Process document with window functions
     */
    async processWithWindows(doc) {
        const windowArray = this.windowFunc(doc);
        
        if (!Array.isArray(windowArray)) {
            throw new Error('Window function must return an array of windows');
        }
        
        // Get current active window IDs
        const currentActiveIds = new Set(this.activeWindows.keys());
        
        // Get new window IDs from this document
        const newWindowIds = new Set(windowArray.map(w => w._id));
        
        // Find windows that are no longer active (need to be closed)
        const windowsToClose = [];
        for (const activeId of currentActiveIds) {
            if (!newWindowIds.has(activeId)) {
                windowsToClose.push(activeId);
            }
        }
        
        // Close windows that are no longer active
        for (const windowId of windowsToClose) {
            await this.closeWindow(windowId);
        }
        
        // Process document for each window it belongs to
        for (const windowInfo of windowArray) {
            await this.processDocumentForWindow(doc, windowInfo);
        }
    }
    
    /**
     * Process document with emit functions
     */
    async processWithEmit(doc) {
        // Generate group key
        const groupValue = this.groupByCallback ? this.groupByCallback(doc, {}) : '__default__';
        const groupKey = this.serializeGroupKey(groupValue);
        
        // Get or create aggregation object for this group
        if (!this.noWindowGroups.has(groupKey)) {
            this.noWindowGroups.set(groupKey, { 
                aggregation: new AggregationObject(this.aggregationSpec, {}),
                groupValue: groupValue
            });
        }
        
        const groupData = this.noWindowGroups.get(groupKey);
        
        // Process the item
        groupData.aggregation.push(doc);
        
        // Check if aggregation values changed (for emit_on_update)
        const hasAggregationChanged = groupData.aggregation.hasChanged();
        
        // Check if we should emit (pass change info for emit_on_update)
        const shouldEmit = this.emitFunc.shouldEmit(doc, groupKey, hasAggregationChanged);
        if (shouldEmit) {
            await this.emitCurrentState();
            // Mark changes as checked after emitting
            for (const [_, data] of this.noWindowGroups.entries()) {
                data.aggregation.markChangeChecked();
            }
        }
    }
    
    /**
     * Process document without windowing or emit (accumulate until flush)
     */
    async processWithoutWindow(doc) {
        // Generate group key
        const groupValue = this.groupByCallback ? this.groupByCallback(doc, {}) : '__default__';
        const groupKey = this.serializeGroupKey(groupValue);
        
        // Get or create aggregation object for this group
        if (!this.noWindowGroups.has(groupKey)) {
            this.noWindowGroups.set(groupKey, { 
                aggregation: new AggregationObject(this.aggregationSpec, {}),
                groupValue: groupValue
            });
        }
        
        const groupData = this.noWindowGroups.get(groupKey);
        
        // Process the item
        groupData.aggregation.push(doc);
    }
    
    /**
     * Emit current state for emit mode
     */
    async emitCurrentState() {
        for (const [groupKey, groupData] of this.noWindowGroups.entries()) {
            const result = groupData.aggregation.getResult();
            
            // Add the group value to the result if we have grouping
            if (this.groupByCallback) {
                result.group_key = groupData.groupValue;
            }
            
            // Add emit information to the result
            if (this.emitFunc) {
                result.emit_info = this.emitFunc.getEmitInfo();
            }
            
            this.emit(result);
        }
    }
    
    /**
     * Process document for a specific window
     */
    async processDocumentForWindow(doc, windowInfo) {
        const windowId = windowInfo ? windowInfo._id : '__default__';
        
        // Ensure window exists in active windows
        if (!this.activeWindows.has(windowId)) {
            this.activeWindows.set(windowId, {
                windowInfo: windowInfo,
                groups: new Map()
            });
        }
        
        const windowData = this.activeWindows.get(windowId);
        
        // Create context with current window info
        const context = {};
        if (windowInfo) {
            context[this.windowVariableName] = windowInfo;
        }
        
        // Generate group key and value
        const groupValue = this.groupByCallback ? this.groupByCallback(doc, context) : '__default__';
        const groupKey = this.serializeGroupKey(groupValue);
        
        // Get or create aggregation object for this group in this window
        if (!windowData.groups.has(groupKey)) {
            // Create aggregation object with context that captures the current window state
            const frozenContext = { ...context };
            windowData.groups.set(groupKey, { 
                aggregation: new AggregationObject(this.aggregationSpec, frozenContext),
                groupValue: groupValue
            });
        }
        
        const groupData = windowData.groups.get(groupKey);
        const aggregationObj = groupData.aggregation;
        
        // Process the item
        aggregationObj.push(doc);
    }
    
    /**
     * Close a window and emit its results
     */
    async closeWindow(windowId) {
        const windowData = this.activeWindows.get(windowId);
        if (!windowData) {
            return;
        }
        
        // Emit results for this window
        for (const [groupKey, groupData] of windowData.groups.entries()) {
            const result = groupData.aggregation.getResult();
            
            // Add the group value to the result if we have grouping
            if (this.groupByCallback) {
                result.group_key = groupData.groupValue;
            }
            
            // Add window information to the result
            if (windowData.windowInfo) {
                result.window = windowData.windowInfo;
            }
            
            this.emit(result);
        }
        
        // Remove the window from active windows
        this.activeWindows.delete(windowId);
    }
    
    /**
     * Emit results for all active windows (used during flush)
     */
    async emitAllWindowResults() {
        for (const [windowId, windowData] of this.activeWindows.entries()) {
            for (const [groupKey, groupData] of windowData.groups.entries()) {
                const result = groupData.aggregation.getResult();
                
                // Add the group value to the result if we have grouping
                if (this.groupByCallback) {
                    result.group_key = groupData.groupValue;
                }
                
                // Add window information to the result
                if (windowData.windowInfo) {
                    result.window = windowData.windowInfo;
                }
                
                this.emit(result);
            }
        }
    }
    
    /**
     * Reset all windows (used when reinitializing)
     */
    resetAllWindows() {
        this.activeWindows.clear();
        // Don't recreate the window function as it maintains its own state counter
    }
    
    /**
     * Flush remaining results when stream ends
     */
    async flush() {
        // Wait for any pending processing to complete
        await this.processQueue;
        
        if (this.windowFunc) {
            // Window mode - emit all active windows
            await this.emitAllWindowResults();
        } else if (this.emitFunc) {
            // Emit mode - force emit current state
            this.emitFunc.forceEmit();
            await this.emitCurrentState();
        } else {
            // No window mode - emit accumulated results
            await this.emitNoWindowResults();
        }
    }
    
    /**
     * Emit results for no-window mode
     */
    async emitNoWindowResults() {
        for (const [groupKey, groupData] of this.noWindowGroups.entries()) {
            const result = groupData.aggregation.getResult();
            
            // Add the group value to the result if we have grouping
            if (this.groupByCallback) {
                result.group_key = groupData.groupValue;
            }
            
            this.emit(result);
        }
    }
}

/**
 * Factory function to create summarize operators with a more convenient API
 */
export function createSummarizeOperator(aggregationSpec, groupByCallback = null, windowSpec = null, emitSpec = null, windowVariableName = 'window') {
    return new SummarizeOperator(aggregationSpec, groupByCallback, windowSpec, emitSpec, windowVariableName);
} 