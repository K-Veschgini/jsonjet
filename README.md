# ResonanceDB

A high-performance stream processing database with flow-based architecture for real-time data processing.

## Usage

```javascript
import { Stream, ScanOperator, Filter, Map } from './src/index.js';

const pipeline = new Stream()
    .pipe(new ScanOperator()
        .addStep('login', (state, doc) => doc.event === 'login')
        .addStep('purchase', (state, doc) => doc.event === 'purchase',
            (state, doc) => ({ 
                userId: state.login.userId,
                amount: doc.amount 
            })))
    .pipe(new Filter(doc => doc.amount > 50))
    .pipe(new Map(doc => ({ ...doc, processed: true })))
    .collect(result => console.log('Output:', result));

pipeline.push({ event: 'login', userId: 'user1' });
pipeline.push({ event: 'purchase', userId: 'user1', amount: 75 });
```

## Creating Operators

```javascript
import { Operator } from './src/core/operator.js';

export class MyOperator extends Operator {
    constructor(config) {
        super();
        this.config = config;
    }
    
    process(doc) {
        if (this.shouldEmit(doc)) {
            this.emit(this.transform(doc));
        }
    }
}
``` 