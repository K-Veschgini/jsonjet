import fs from 'fs';
import path from 'path';

/**
 * AssertOrSaveExpected - Testing operator that either saves expected output or verifies against it
 * Usage: | assert_or_save_expected("/path/to/expected.ndjson")
 * 
 * Behavior:
 * - If file doesn't exist: Creates file and writes all received items (sorted keys) as NDJSON
 * - If file exists: Reads file and compares each item against received items, logs errors to _log stream
 */
export class AssertOrSaveExpected {
    constructor(filePath) {
        this.filePath = filePath;
        this.receivedItems = [];
        this.expectedItems = null;
        this.isCreateMode = false;
        this.itemCount = 0;
        this.downstream = null;
        this.stream = null;
        
        this._initialize();
    }

    _initialize() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Check if file exists
            if (fs.existsSync(this.filePath)) {
                // Read mode - load expected items
                this.isCreateMode = false;
                const content = fs.readFileSync(this.filePath, 'utf8').trim();
                if (content) {
                    this.expectedItems = content.split('\n').map(line => JSON.parse(line));
                } else {
                    this.expectedItems = [];
                }
                console.log(`AssertOrSaveExpected: Loaded ${this.expectedItems.length} expected items from "${this.filePath}"`);
            } else {
                // Create mode - will save received items
                this.isCreateMode = true;
                console.log(`AssertOrSaveExpected: Will create expected file "${this.filePath}"`);
            }
        } catch (error) {
            console.error(`AssertOrSaveExpected: Error initializing "${this.filePath}":`, error.message);
            throw error;
        }
    }

    _sortKeys(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this._sortKeys(item));
        }
        
        const sorted = {};
        Object.keys(obj).sort().forEach(key => {
            sorted[key] = this._sortKeys(obj[key]);
        });
        return sorted;
    }

    _logError(message, details = {}) {
        const errorData = {
            timestamp: new Date().toISOString(),
            operator: 'assert_or_save_expected',
            file: this.filePath,
            message,
            ...details
        };
        
        // Try to access the stream manager to log to _log stream
        if (this.stream && this.stream.streamManager) {
            this.stream.streamManager.insertIntoStream('_log', errorData);
        } else {
            console.error('AssertOrSaveExpected Error:', message, details);
        }
    }

    async process(item) {
        this.itemCount++;
        
        // Sort keys in the received item
        const sortedItem = this._sortKeys(item);
        
        if (this.isCreateMode) {
            // Create mode - collect items to save later
            this.receivedItems.push(sortedItem);
        } else {
            // Assert mode - compare against expected items
            if (this.itemCount - 1 >= this.expectedItems.length) {
                this._logError(`Received more items than expected`, {
                    receivedIndex: this.itemCount - 1,
                    expectedCount: this.expectedItems.length,
                    receivedItem: sortedItem
                });
            } else {
                const expectedItem = this.expectedItems[this.itemCount - 1];
                const receivedJson = JSON.stringify(sortedItem);
                const expectedJson = JSON.stringify(expectedItem);
                
                if (receivedJson !== expectedJson) {
                    this._logError(`Item mismatch at index ${this.itemCount - 1}`, {
                        index: this.itemCount - 1,
                        expected: expectedItem,
                        received: sortedItem,
                        expectedJson,
                        receivedJson
                    });
                }
            }
        }

        // Pass item downstream unchanged
        if (this.downstream) {
            await this.downstream.process(item);
        }
    }

    async flush() {
        if (this.isCreateMode && this.receivedItems.length > 0) {
            // Create mode - save all received items to file
            try {
                const ndjsonContent = this.receivedItems
                    .map(item => JSON.stringify(item))
                    .join('\n') + '\n';
                
                fs.writeFileSync(this.filePath, ndjsonContent);
                console.log(`AssertOrSaveExpected: Saved ${this.receivedItems.length} items to "${this.filePath}"`);
            } catch (error) {
                this._logError(`Failed to save expected file`, {
                    error: error.message,
                    itemCount: this.receivedItems.length
                });
            }
        } else if (!this.isCreateMode) {
            // Assert mode - check if we received the right number of items
            if (this.itemCount < this.expectedItems.length) {
                this._logError(`Received fewer items than expected`, {
                    receivedCount: this.itemCount,
                    expectedCount: this.expectedItems.length
                });
            } else if (this.itemCount === this.expectedItems.length && this.itemCount > 0) {
                console.log(`AssertOrSaveExpected: ✅ All ${this.itemCount} items matched expected output`);
            }
        }

        // Pass flush downstream
        if (this.downstream) {
            await this.downstream.flush();
        }
    }

    async cleanup() {
        // Flush any remaining data
        await this.flush();
    }

    push(item) {
        this.process(item).catch(error => {
            this._logError(`Processing error`, {
                error: error.message,
                item
            });
        });
    }

    emit(item) {
        this.push(item);
    }

    pipe(operator) {
        this.downstream = operator;
        operator.stream = this.stream;
        return operator;
    }

    // Get stats for debugging
    getStats() {
        return {
            filePath: this.filePath,
            isCreateMode: this.isCreateMode,
            itemCount: this.itemCount,
            expectedItemCount: this.expectedItems ? this.expectedItems.length : 0,
            receivedItemCount: this.receivedItems.length
        };
    }
}

export default AssertOrSaveExpected;