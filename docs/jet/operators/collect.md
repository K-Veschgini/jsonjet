# collect Operator

The `collect` operator collects all documents into memory.

## Syntax

```jsonjet
| collect()
```

## Description

The `collect` operator gathers all documents from the pipeline into memory. This is useful for operations that need to process all data at once, but should be used with caution due to memory implications.

## Examples

### Basic Usage

```jsonjet
| collect()
```

### In Complete Flows

```jsonjet
create flow data_collection as
  sensor_data
  | where temperature > 25
  | collect()

create flow batch_processing as
  events
  | where type = "error"
  | select { id, error_message }
  | collect()
```

## Use Cases

### Batch Processing
Collect data for batch operations that require all documents at once.

### Data Analysis
Gather data for analysis that needs complete dataset access.

### Testing and Debugging
Collect results for testing or debugging purposes.

### Memory-Intensive Operations
Operations that require access to the entire dataset in memory.

## Performance Considerations

⚠️ **Warning**: This operator loads all documents into memory, which can cause:
- High memory usage with large datasets
- Potential out-of-memory errors
- Slower processing for very large datasets

Use this operator carefully and only when necessary.

## Related Operators

- [where](./where.md) - Filter data before collection
- [select](./select.md) - Transform data before collection
- [summarize](./summarize.md) - Alternative aggregation approach 