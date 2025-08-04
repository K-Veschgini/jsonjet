# insert_into Operator

The `insert_into` operator routes pipeline data to a target stream.

## Syntax

```jsonjet
| insert_into(<stream_name>)
```

## Description

This operator forwards all documents from the current pipeline to a specified target stream. It's typically positioned at the end of flows to route processed data to output destinations.

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



## Performance Considerations

- Data routes to the target stream immediately
- No buffering or batching occurs
- Target stream must exist before insertion
- Consider stream capacity and subscriber load

## Related Operators

- [WHERE](./where.md) - Filter data before routing
- [SELECT](./select.md) - Transform data before routing
- [WRITE_TO_FILE](./write-to-file.md) - Alternative output method 