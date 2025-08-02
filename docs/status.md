# Project Status

## Current Development Stage

JSONJet is in **Technical Preview**—core functionality is operational and ready for evaluation, while the architecture continues to evolve.

## Development Philosophy

JSONJet follows a deliberate architectural strategy. Rather than rushing to implement every mathematical function and aggregation operator, I've focused on building solid foundational infrastructure first.

The philosophy is straightforward: **architecture is the foundation everything else builds upon**. By implementing complex core functionalities first—query parser, transpiler, stream management, and real-time processing—new mathematical functions and aggregations integrate seamlessly.

This means I've prioritized:

- **Robust stream processing architecture** that can handle high-throughput, real-time data
- **Flexible query language parser** that can evolve to support new operators
- **Efficient memory management** optimized for edge computing scenarios  
- **Solid transpilation and execution engine** that provides the foundation for all operations

With solid foundational systems, adding mathematical functions, statistical aggregations, and analytics operators becomes straightforward—each leveraging existing infrastructure without architectural changes.

## What's Working Now

- Core stream processing engine
- Real-time flow creation and management
- Query language parser and transpiler
- Some core operators (where, select, scan, summarize, ...)
- WebSocket and HTTP APIs


## What's Coming Next (2025 Q3)

- UI for the server
- Advanced security layer

## Feedback Welcome

Since JSONJet is in technical preview, your feedback is invaluable. If you're evaluating or building with JSONJet, please share your experience, use cases, and any issues you encounter. This input directly shapes development priorities.

**Contact:** Prof. Dr. Kambis Veschgini - k.veschgini@oth-aw.de

This technical preview reflects a commitment to building things right rather than quickly, resulting in a more robust and performant platform.