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
        // If no pending operations, resolve immediately
        if (this.pendingCount === 0) {
            return Promise.resolve();
        }
        
        // Create promise that resolves when all operations complete
        if (!this.finishPromise) {
            this.finishPromise = new Promise(resolve => {
                this.finishResolve = resolve;
            });
        }
        
        return this.finishPromise;
    }
} 