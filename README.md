# ResonanceDB

A high-performance stream processing database with flow-based architecture for real-time data processing.

## 🌟 Features

- **Stream Processing** - Real-time data flow processing with operators
- **Flow-based Architecture** - Compose complex data transformations
- **HTTP API Server** - REST endpoints for query execution and management  
- **WebSocket Streaming** - Real-time data subscriptions
- **Cross-platform Binaries** - Standalone executables for all major platforms
- **SQL-like Query Language** - Familiar syntax for data operations

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

## 🚀 Quick Start with Server

```bash
# Start the HTTP/WebSocket server
cd packages/server
bun start

# Or build cross-platform binaries
bun run build:server
```

The server provides:
- **HTTP API** on `http://localhost:3000/api/*`
- **WebSocket streaming** on `ws://localhost:3000/ws`
- **Real-time subscriptions** to data streams
- **Query execution** via REST endpoints

## 📦 Packages

- **`packages/core/`** - Core streaming database engine  
- **`packages/server/`** - Bun HTTP/WebSocket server with cross-platform builds
- **`packages/demo/`** - Interactive web demo and examples
- **`packages/ui/`** - Shared UI components for frontend applications

## 🏗️ Development

```bash
# Install dependencies
bun install

# Run tests  
bun test

# Start development demo
bun run dev:demo

# Build cross-platform server binaries
bun run build:server
```

See [BUILD.md](./BUILD.md) for detailed cross-platform build instructions.