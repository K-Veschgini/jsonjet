# Introduction

JSONJet is a JavaScript database with real-time streaming capabilities. It provides SQL-like query syntax for processing data streams in real-time.

## Key Features

### Stream Processing
JSONJet processes data as streams, allowing for real-time data processing and analysis.

### Lookup Definitions
Create and manage lookup tables for data enrichment:

```sql
create lookup threshold = 50
create lookup multiplier = 2

-- Use in queries
create flow analysis as
  data_stream 
  | where value > threshold
  | select { original: value, doubled: value * multiplier }
```

### Array Indexing
Native support for array operations:

```sql
-- Insert data with arrays
insert into users {"name": "Alice", "scores": [85, 92, 78, 95]}

-- Access array elements
create flow results as
  users 
  | select { 
      name: name,
      firstScore: scores[0],
      totalScores: scores.length
    }
```

### SQL-like Syntax
Familiar query syntax for data manipulation:

```sql
create stream events
create flow filtered as
  events 
  | where type = "error"
  | select { timestamp: timestamp, message: message }
  | insert_into(error_log)
```

## Next Steps

- [Quick Start Guide](/guide/quick-start) - Get up and running quickly
- [API Reference](/api/) - Detailed API documentation