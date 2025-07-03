import { streamManager } from '../core/stream-manager.js';

/**
 * InsertInto - Pipe operator that writes results to another stream before passing them downstream
 * Usage: | insert_into(targetStream)
 */
export class InsertInto {
    constructor(targetStreamName) {
        this.targetStreamName = targetStreamName;
        this.downstream = null;
        this.stream = null;
    }

    async process(item) {
        try {
            // Insert the item into the target stream
            await streamManager.insertIntoStream(this.targetStreamName, item);
            
            // Pass the item downstream unchanged
            if (this.downstream) {
                await this.downstream.process(item);
            }
        } catch (error) {
            console.error(`Error in insert_into(${this.targetStreamName}):`, error);
            // Still pass downstream even if insert fails
            if (this.downstream) {
                await this.downstream.process(item);
            }
        }
    }

    async flush() {
        if (this.downstream) {
            await this.downstream.flush();
        }
    }

    push(item) {
        this.process(item).catch(error => {
            console.error(`InsertInto push error:`, error);
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
}

export default InsertInto;