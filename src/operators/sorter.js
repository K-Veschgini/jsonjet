import { Operator } from '../core/operator.js';

export class Sorter extends Operator {
    constructor(keyExtractor, maxBufferSize = 100, maxAgeMs = 5000) {
        super();
        this.keyExtractor = keyExtractor;
        this.maxBufferSize = maxBufferSize;
        this.maxAgeMs = maxAgeMs;
        this.watermark = -Infinity;
        
        // Two sorted structures for fast access
        this.byValue = [];    // Sorted by extracted value (for emission order)
        this.byTime = [];     // Sorted by insertion time (for age-based eviction)
        this.entryId = 0;     // Unique ID for linking entries between structures
    }
    
    async process(doc) {
        const key = this.keyExtractor(doc);
        const now = Date.now();
        
        // Discard if too late (smaller than watermark)
        if (key < this.watermark) {
            return;
        }
        
        // Evict expired entries first
        this.evictExpired(now);
        
        // Create entry with unique ID for cross-referencing
        const entry = { 
            doc, 
            key, 
            timestamp: now, 
            id: this.entryId++ 
        };
        
        // Insert into both structures
        this.insertByValue(entry);
        this.insertByTime(entry);
        
        // Evict oldest if buffer too large
        while (this.byTime.length >= this.maxBufferSize) {
            this.evictOldest();
        }
        
        // Try to emit ready entries
        this.emitReady(now);
    }
    
    insertByValue(entry) {
        let insertIndex = 0;
        while (insertIndex < this.byValue.length && 
               this.byValue[insertIndex].key <= entry.key) {
            insertIndex++;
        }
        this.byValue.splice(insertIndex, 0, entry);
    }
    
    insertByTime(entry) {
        // Always append to time array (already sorted by insertion time)
        this.byTime.push(entry);
    }
    
    removeFromValue(entryId) {
        const index = this.byValue.findIndex(e => e.id === entryId);
        if (index !== -1) {
            this.byValue.splice(index, 1);
        }
    }
    
    removeFromTime(entryId) {
        const index = this.byTime.findIndex(e => e.id === entryId);
        if (index !== -1) {
            this.byTime.splice(index, 1);
        }
    }
    
    evictOldest() {
        if (this.byTime.length === 0) return;
        
        const oldest = this.byTime.shift();
        this.removeFromValue(oldest.id);
        this.watermark = Math.max(this.watermark, oldest.key);
        this.emit(oldest.doc);
    }
    
    evictExpired(now) {
        const cutoff = now - this.maxAgeMs;
        
        // Remove all expired entries from time-sorted array
        while (this.byTime.length > 0 && this.byTime[0].timestamp < cutoff) {
            const expired = this.byTime.shift();
            this.removeFromValue(expired.id);
            this.watermark = Math.max(this.watermark, expired.key);
            this.emit(expired.doc);
        }
    }
    
    emitReady(now) {
        // Emit entries that are ready based on buffer pressure or partial aging
        while (this.byTime.length > 0) {
            const oldest = this.byTime[0];
            const age = now - oldest.timestamp;
            
            // Emit if moderately old or if buffer is getting full
            if (age > this.maxAgeMs / 2 || this.byTime.length >= this.maxBufferSize * 0.8) {
                this.evictOldest();
            } else {
                break;
            }
        }
    }

}
