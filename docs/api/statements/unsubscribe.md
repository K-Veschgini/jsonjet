# unsubscribe Statement

The `unsubscribe` statement unsubscribes from a stream using subscription ID.

## Syntax

```jsonjet
unsubscribe <subscription_id>
```

## Description

The `unsubscribe` statement stops a subscription to a stream using the subscription ID that was returned when the subscription was created.

## Parameters

- `subscription_id`: Numeric ID of the subscription to stop

## Examples

### Basic Unsubscription

```jsonjet
unsubscribe 123
unsubscribe 456
unsubscribe 789
```

### Multiple Unsubscriptions

```jsonjet
unsubscribe 1
unsubscribe 2
unsubscribe 3
```

## Behavior

- Stops the subscription immediately
- No more data will be printed from that subscription
- Subscription ID becomes invalid
- Stream continues to exist and can have other subscribers
- If subscription ID doesn't exist, an error is returned

## Use Cases

### Cleanup
Stop subscriptions that are no longer needed.

### Resource Management
Free up system resources by stopping unused subscriptions.

### Testing
Stop test subscriptions after testing.

### Administration
Manage active subscriptions during system administration.

## Related Statements

- [subscribe](./subscribe.md) - Create a subscription
- [list](./list.md) - List active subscriptions 