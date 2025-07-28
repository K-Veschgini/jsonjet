# create stream Statement

The `create stream` statement creates a new data stream.

## Syntax

```jsonjet
create stream <stream_name>
create or replace stream <stream_name>
create if not exists stream <stream_name>
```

## Description

The `create stream` statement defines a new named data stream that can receive and route documents. Streams are the primary data routing mechanism in JSONJet and serve as pure data pipes.

## Parameters

- `stream_name`: Identifier for the stream (must start with letter/underscore, contain only letters, numbers, and underscores)

## Modifiers

### or replace
Replaces an existing stream if it exists, otherwise creates a new one.

### if not exists
Only creates the stream if it doesn't already exist. If the stream exists, the statement succeeds without error.

## Examples

### Basic Stream Creation

```jsonjet
create stream sensor_data
create stream user_events
create stream application_logs
```

### With Replace Modifier

```jsonjet
create or replace stream sensor_data
create or replace stream events
```

### With Existence Check

```jsonjet
create if not exists stream sensor_data
create if not exists stream backup_stream
```

## Stream Behavior

- Streams are pure data pipes that route documents to subscribers
- If no subscribers are listening, data is lost (correct streaming behavior)
- Streams are not persistent storage - they don't retain data
- Multiple flows can read from the same stream
- Streams can have multiple subscribers

## Use Cases

### Data Ingestion
Create streams to receive data from external sources.

### Pipeline Input
Define input streams for data processing flows.

### Event Routing
Route events to different processing pipelines.

### Real-time Data
Handle real-time data streams for immediate processing.

## Related Statements

- [delete stream](./delete-stream.md) - Remove a stream
- [insert into](./insert-into.md) - Add data to a stream
- [subscribe](./subscribe.md) - Listen to a stream
- [list](./list.md) - List all streams 