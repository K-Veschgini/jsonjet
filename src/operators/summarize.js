import { Operator } from '../core/operator.js';

export class SummarizeOperator extends Operator {
    constructor({
        onWindowOpen,    // func() - called when new window opens
        onItem,          // func(item, state) - called for every object in window  
        onWindowClose,   // func(state) - called when window closes, returns result
        windowFunc,      // func(item) - optional windowing function
        groupFunc        // func(item) - optional grouping function
    }) {
        super();
        this.onWindowOpen = onWindowOpen;
        this.onItem = onItem;
        this.onWindowClose = onWindowClose;
        this.windowFunc = windowFunc;
        this.groupFunc = groupFunc;
        
        // Current window state
        this.currentWindow = null;
        this.windowState = null;
        this.groups = new Map(); // groupKey -> groupState
        
        this.initializeWindow();
    }
    
    initializeWindow() {
        this.currentWindow = null;
        this.windowState = null;
        this.groups.clear();
        
        if (this.onWindowOpen) {
            this.windowState = this.onWindowOpen();
        }
    }
    
    async process(doc) {
        // Check if we need to handle windowing
        if (this.windowFunc) {
            const windowKey = this.windowFunc(doc);
            
            // If window changed, close current window and open new one
            if (this.currentWindow !== null && this.currentWindow !== windowKey) {
                await this.closeCurrentWindow();
                this.initializeWindow();
            }
            
            this.currentWindow = windowKey;
        }
        
        // Handle grouping if provided
        if (this.groupFunc) {
            const groupKey = this.groupFunc(doc);
            
            // Get or create group state
            if (!this.groups.has(groupKey)) {
                this.groups.set(groupKey, this.onWindowOpen ? this.onWindowOpen() : {});
            }
            
            const groupState = this.groups.get(groupKey);
            
            // Process item in this group
            if (this.onItem) {
                this.onItem(doc, groupState);
            }
        } else {
            // No grouping - process item in main window state
            if (this.onItem) {
                this.onItem(doc, this.windowState);
            }
        }
    }
    
    async closeCurrentWindow() {
        if (!this.onWindowClose) return;
        
        if (this.groupFunc && this.groups.size > 0) {
            // Emit results for each group
            for (const [groupKey, groupState] of this.groups.entries()) {
                const result = this.onWindowClose(groupState);
                if (result !== undefined) {
                    if (typeof result !== 'object') {
                        // TODO: Handle invalid result type - should be an object
                        continue;
                    }
                    this.emit(result);
                }
            }
        } else {
            // No grouping - emit single result
            const result = this.onWindowClose(this.windowState);
            if (result !== undefined) {
                if (typeof result !== 'object') {
                    // TODO: Handle invalid result type - should be an object
                    return;
                }
                this.emit(result);
            }
        }
    }
    
    async flush() {
        // Handle final window when stream ends
        await this.closeCurrentWindow();
    }
} 