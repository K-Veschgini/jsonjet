# flush Statement

The `flush` statement clears buffered data from a stream.

## Syntax

```jsonjet
flush <stream_name>
```

## Description

This statement removes all buffered data from a stream while preserving the stream structure. The operation clears internal buffers but maintains active flows and subscriptions.

## Parameters

- `stream_name`: Name of the stream to flush (must be a valid identifier)

## Examples

### Basic Stream Flush

```jsonjet
flush sensor_data
flush temp_stream
flush event_buffer
```

### Maintenance Operations

```jsonjet
flush old_data
flush test_stream
flush backup_buffer
```

## Behavior

- Clears all data currently in the stream
- Stream remains active and can receive new data
- All flows reading from the stream continue to operate
- All subscriptions remain active
- Operation is immediate and irreversible



## Related Statements

- [delete stream](./delete-stream.md) - Remove a stream entirely
- [list](./list.md) - List all streams
- [info](./info.md) - Get stream information 