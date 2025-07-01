import { Operator } from '../core/operator.js';
import { AggregationObject } from '../aggregations/core/aggregation-object.js';

/**
 * Summarize operator that supports the new syntax:
 * summarize {key: count(), total: sum("field") } by groupByCallback over window = hopping_window(...)
 */
export class SummarizeOperator extends Operator {
    constructor(aggregationSpec, groupByCallback = null, windowSpec = null, windowName = 'window') {
        super();
        this.aggregationSpec = aggregationSpec;
        this.groupByCallback = groupByCallback;
        this.windowSpec = windowSpec;
        this.windowName = windowName;
        
        // Runtime state
        this.currentWindow = null;
        this.groups = new Map(); // groupKey -> AggregationObject
        this.windowFunc = null;
        this.processQueue = Promise.resolve(); // Serialize processing
        
        this.initializeWindow();
    }
    
    /**
     * Initialize the window function
     */
    initializeWindow() {
        if (this.windowSpec && this.windowSpec.createWindowFunc) {
            this.windowFunc = this.windowSpec.createWindowFunc();
        }
        this.currentWindow = null;
        this.groups.clear();
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
        // Handle windowing
        if (this.windowFunc) {
            const windowInfo = this.windowFunc(doc);
            
            // If window changed, emit results and reset
            if (this.currentWindow !== null && 
                JSON.stringify(this.currentWindow) !== JSON.stringify(windowInfo)) {
                await this.emitWindowResults();
                this.resetForNewWindow();
            }
            
            // Update current window
            this.currentWindow = windowInfo;
        }
        
        // Create context with current window info
        const context = {};
        if (this.currentWindow) {
            context[this.windowName] = this.currentWindow;
        }
        
        // Generate group key
        const groupKey = this.generateGroupKey(doc, context);
        
        // Get or create aggregation object for this group
        if (!this.groups.has(groupKey)) {
            // Create aggregation object with context that captures the current window state
            const frozenContext = { ...context };
            this.groups.set(groupKey, new AggregationObject(this.aggregationSpec, frozenContext));
        }
        
        const aggregationObj = this.groups.get(groupKey);
        
        // Process the item
        aggregationObj.push(doc);
    }
    
    /**
     * Emit results for current window
     */
    async emitWindowResults() {
        for (const [groupKey, aggregationObj] of this.groups.entries()) {
            const result = aggregationObj.getResult();
            this.emit(result);
        }
    }
    
    /**
     * Reset for new window
     */
    resetForNewWindow() {
        this.groups.clear();
        // Don't recreate the window function as it maintains its own state counter
    }
    
    /**
     * Flush remaining results when stream ends
     */
    async flush() {
        // Wait for any pending processing to complete
        await this.processQueue;
        // Then emit final results
        await this.emitWindowResults();
    }
}

/**
 * Factory function to create summarize operators with a more convenient API
 */
export function createSummarizeOperator(aggregationSpec, groupByCallback = null, windowSpec = null, windowName = 'window') {
    return new SummarizeOperator(aggregationSpec, groupByCallback, windowSpec, windowName);
} 