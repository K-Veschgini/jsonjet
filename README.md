# JSONJet

A document-based stream processing engine for real-time data analysis. This research explores flow-based architectures with a declarative query language inspired by Kusto.

📖 [Documentation](./docs/) • [Live Demo](./packages/demo/)


## Research Overview

My work focuses on developing a streaming database that processes JSON documents in real-time using a pipe-based query syntax. The system employs just-in-time compilation for query execution and maintains minimal memory overhead for edge computing applications.

The theoretical framework centers on two primary abstractions: streams as data routing mechanisms and flows as continuous processing pipelines. This approach enables complex data transformations through compositional operators.

## Building from Source

This monorepo requires Bun as the runtime environment:

```bash
# Install dependencies
bun install

# Run test suite
bun test

# Build server distribution
bun run build:dist

# Start development demo
bun run dev:demo
```

The build system generates cross-platform binaries for the server component and prepares web-based demonstration interfaces.


