# 🔥 Server Profiling Guide

This guide shows how to generate flame graphs of the JSONJet server during benchmark execution.

## Quick Start

### 1. **Automatic Server Profiling**
```bash
# Profile server during all benchmarks
bash profile-server-benchmarks.sh all

# Profile server during simple test only
bash profile-server-benchmarks.sh simple

# Profile server during full performance test
bash profile-server-benchmarks.sh full
```

### 2. **Manual Server Profiling** (Recommended for detailed analysis)

**Terminal 1 - Start server with profiling:**
```bash
bun --profile --flamegraph src/index.js
```

**Terminal 2 - Run benchmarks:**
```bash
# Run specific benchmark
bun profile-single-benchmark.js http-batch

# Or run full performance test
bun performance-test.js

# Or run simple test
bun simple-test.js
```

**Terminal 1 - Stop server:**
```bash
# Press Ctrl+C in Terminal 1 to stop server and generate flame graph
```

### 3. **Chrome DevTools Profiling**

**Terminal 1 - Start server with inspector:**
```bash
bun --inspect src/index.js
```

**Chrome Browser:**
1. Open `chrome://inspect`
2. Click "Open dedicated DevTools for Node"
3. Go to "Profiler" tab
4. Click "Start" to begin profiling

**Terminal 2 - Run benchmarks:**
```bash
bun performance-test.js
```

**Chrome Browser:**
1. Click "Stop" in Profiler tab
2. Analyze the flame graph

## 📊 What to Look For in Server Flame Graphs

### 🔍 Key Performance Areas:

1. **HTTP Request Handling**
   - `/api/insert` vs `/api/execute` performance
   - JSON parsing overhead
   - Request routing efficiency

2. **WebSocket Message Processing**
   - Message parsing and dispatch
   - Insert operation handling
   - Response generation

3. **Stream Processing**
   - `insertIntoStream` operations
   - Flow execution and aggregation
   - Stream flushing and triggering

4. **Query Engine**
   - Query parsing and transpilation
   - AST generation and execution
   - Flow creation and management

5. **Data Aggregation**
   - Summarize operations
   - Count and sum calculations
   - Result stream insertions

### 🎯 Performance Bottlenecks to Identify:

- **JSON serialization/deserialization**
- **RegExp operations** (in parsers)
- **Object creation/destruction**
- **Stream event handling**
- **Aggregation computations**
- **WebSocket frame processing**

## 📈 Comparing Different Insertion Methods

Generate flame graphs for each method to compare:

```bash
# HTTP Single Inserts
bun --profile --flamegraph src/index.js &
bun profile-single-benchmark.js http-single
# Stop server, save flamegraph as http-single.html

# HTTP Batch Inserts  
bun --profile --flamegraph src/index.js &
bun profile-single-benchmark.js http-batch
# Stop server, save flamegraph as http-batch.html

# WebSocket Single Inserts
bun --profile --flamegraph src/index.js &
bun profile-single-benchmark.js ws-single
# Stop server, save flamegraph as ws-single.html

# WebSocket Batch Inserts
bun --profile --flamegraph src/index.js &
bun profile-single-benchmark.js ws-batch
# Stop server, save flamegraph as ws-batch.html
```

## 🔧 Profile File Locations

- **Flame graphs**: `profile.html` (generated in current directory)
- **Profile data**: `profile.json` (raw profiling data)
- **Organized profiles**: `profiles/` directory (when using scripts)

## 💡 Advanced Profiling Tips

### Memory Profiling
```bash
# Profile memory usage
bun --heap-profile src/index.js
```

### CPU Sampling
```bash
# Higher sampling rate for detailed analysis
bun --cpu-prof src/index.js
```

### Custom Profiling Duration
```bash
# Profile for specific duration
timeout 30s bun --profile --flamegraph src/index.js
```

## 🎯 Expected Flame Graph Patterns

- **HTTP Batch**: Should show efficient bulk processing
- **WebSocket**: Should show lower per-message overhead
- **Stream Processing**: Should show aggregation computations
- **Query Engine**: Should show parsing overhead in `/api/execute`

Happy profiling! 🔥