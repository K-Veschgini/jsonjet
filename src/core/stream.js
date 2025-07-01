import { Operator } from './operator.js';

export class Stream {
    constructor() {
        this.head = null;
        this.tail = null;
        this.pendingCount = 0;
        this.finishPromise = null;
        this.finishResolve = null;
    }
    
    pipe(operator) {
        // Set stream reference so operator can track completion
        operator.stream = this;
        
        if (!this.head) {
            this.head = this.tail = operator;
        } else {
            this.tail.pipe(operator);
            this.tail = operator;
        }
        return this;
    }
    
    push(doc) {
        if (this.head) {
            this.pendingCount++;
            this.head.push(doc);
        }
    }
    
    collect(callback) {
        const collector = new (class extends Operator {
            async process(doc) {
                callback(doc);
            }
        })();
        
        return this.pipe(collector);
    }
    
    async finish() {
        // Create promise for completion before starting flush
        if (!this.finishPromise) {
            this.finishPromise = new Promise(resolve => {
                this.finishResolve = resolve;
            });
        }
        
        // First, flush all operators in the pipeline
        await this.flushAll();
        
        // If no pending operations after flush, resolve immediately
        if (this.pendingCount === 0) {
            if (this.finishResolve) {
                this.finishResolve();
                this.finishResolve = null;
            }
            return Promise.resolve();
        }
        
        // Wait for all pending operations to complete
        return this.finishPromise;
    }
    
    async flushAll() {
        // Walk through the pipeline and flush each operator
        let current = this.head;
        while (current) {
            if (current.flush) {
                await current.flush();
            }
            current = current.downstream;
        }
    }
} 