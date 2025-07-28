# insert_into Operator

The `insert_into` operator routes data to another stream.

## Syntax

```jsonjet
| insert_into(<stream_name>)
```

## Description

The `INSERT_INTO` operator sends all documents from the current pipeline to a specified target stream. This is commonly used at the end of flows to route processed data to output streams.

## Parameters

- `stream_name`: The name of the target stream to insert data into

## Examples

### Basic Usage

```jsonjet
| insert_into(processed_data)
| insert_into(alerts)
| insert_into(output_stream)
```

### In Complete Flows

```jsonjet
create flow data_processor as
  sensor_data 
  | where temperature > 25 
  | select { id: id, temp: temperature, alert: true } 
  | insert_into(processed_data)

create flow alert_system as
  events
  | where severity > 5
  | select { ...*, alert_level: "high" }
  | insert_into(critical_alerts)
```

### Multiple Output Streams

```jsonjet
create flow multi_output as
  input_stream
  | where type = "error"
  | insert_into(error_stream)
  | where severity > 8
  | insert_into(critical_error_stream)
```

### With Data Transformation

```jsonjet
create flow data_enrichment as
  raw_data
  | select { 
      id, 
      enriched_data: { ...*, processed_at: now() } 
    }
  | insert_into(enriched_data_stream)
```

## Use Cases

### Data Routing
Route different types of data to appropriate streams based on processing logic.

### Pipeline Branches
Create multiple output streams from a single processing pipeline.

### Data Archival
Send processed data to archival or backup streams.

### Real-time Dashboards
Feed processed data to streams that power real-time dashboards.

## Performance Considerations

- Data is sent to the target stream immediately
- No buffering or batching is performed
- Target stream must exist before insertion
- Consider stream capacity and subscriber load

## Related Operators

- [WHERE](./where.md) - Filter data before routing
- [SELECT](./select.md) - Transform data before routing
- [WRITE_TO_FILE](./write-to-file.md) - Alternative output method 