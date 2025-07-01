export class Operator {
    constructor() {
        this.downstream = null;
        this.stream = null; // Will be set by Stream when piped
    }
    
    async process(doc) {
        throw new Error('Must implement process method');
    }
    
    push(doc) {
        // Process async but don't await - fire and forget
        this.process(doc).then(() => {
            // Decrement pending count when this operator finishes processing
            if (this.stream) {
                this.stream.pendingCount--;
                if (this.stream.pendingCount === 0 && this.stream.finishResolve) {
                    this.stream.finishResolve();
                    this.stream.finishResolve = null;
                }
            }
        }).catch(error => {
            console.error('Error in operator processing:', error);
            // Still decrement on error to avoid hanging
            if (this.stream) {
                this.stream.pendingCount--;
                if (this.stream.pendingCount === 0 && this.stream.finishResolve) {
                    this.stream.finishResolve();
                    this.stream.finishResolve = null;
                }
            }
        });
    }
    
    emit(doc) {
        if (this.downstream) {
            this.downstream.push(doc);
        }
    }
    
    pipe(operator) {
        this.downstream = operator;
        return operator;
    }
} 