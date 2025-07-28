# subscribe Statement

The `subscribe` statement subscribes to a stream for real-time data.

## Syntax

```jsonjet
subscribe <stream_name>
```

## Description

The `subscribe` statement creates a subscription to a stream, allowing you to receive real-time data from that stream. The subscription will print received data to the console.

## Parameters

- `stream_name`: Name of the stream to subscribe to (must be a valid identifier)

## Examples

### Basic Subscription

```jsonjet
subscribe sensor_data
subscribe events
subscribe logs
```

### Multiple Subscriptions

```jsonjet
subscribe temperature_stream
subscribe humidity_stream
subscribe pressure_stream
```

## Behavior

- Creates a subscription with a unique ID
- Prints received data to the console in the format: `📡 [stream_name]: data`
- Subscription remains active until manually unsubscribed
- Multiple subscriptions can be created to the same stream
- Subscription ID is returned for later unsubscription

## Output Format

When data is received, it's printed in this format:
```
📡 [sensor_data]: { "id": "sensor1", "temperature": 23.5, "timestamp": 1640995200 }
📡 [events]: { "type": "login", "user": "alice", "time": 1640995200 }
```

## Use Cases

### Real-time Monitoring
Monitor data streams in real-time.

### Debugging
Debug data flow and content.

### Development
Test data ingestion and processing.

### Administration
Monitor system activity and data flow.

## Related Statements

- [unsubscribe](./unsubscribe.md) - Stop a subscription
- [list](./list.md) - List active subscriptions
- [create stream](./create-stream.md) - Create streams to subscribe to
- [insert into](./insert-into.md) - Add data to subscribed streams 