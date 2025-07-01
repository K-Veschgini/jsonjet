# JSDB - Streaming Data Processing Library

A high-performance JavaScript library for real-time data processing with chainable operators.

## Quick Start

 ### Single File Bundle
 ```bash
 bun jsdb.js
 ```
 
 ### Modular Version
 ```bash
 cd lib
 bun main.js
 ```

## Features

- **Scan Operator**: Azure ADX-style pattern matching
- **Filter Operator**: Predicate-based filtering  
- **Map Operator**: Document transformation
- **Sorter Operator**: Real-time time-series sorting
- **Stream Pipeline**: Chainable operator composition

## Usage

```javascript
import { Stream, ScanOperator, Filter, Map } from './lib/src/index.js';

const pipeline = new Stream()
    .pipe(new ScanOperator().addStep('login', (s, r) => r.event === 'login'))
    .pipe(new Filter(doc => doc.score > 0.5))
    .pipe(new Map(doc => ({ ...doc, processed: true })))
    .collect(result => console.log(result));

pipeline.push({ event: 'login', score: 0.8 });
```

Built with Bun 1.2.17
Generated on 2025-06-30T21:19:15.087Z
