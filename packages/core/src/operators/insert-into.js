/**
 * InsertInto - Pipe operator that writes results to another stream before passing them downstream
 * Usage: | insert_into(insertCallback)
 */
export class InsertInto {
    constructor(insertCallback) {
        this.insertCallback = insertCallback;
        this.downstream = null;
        this.stream = null;
    }

    async process(item) {
        try {
            // Insert the item using the provided callback
            await this.insertCallback(item);
            
            // Pass the item downstream unchanged
            if (this.downstream) {
                await this.downstream.process(item);
            }
        } catch (error) {
            console.error(`Error in insert_into:`, error);
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