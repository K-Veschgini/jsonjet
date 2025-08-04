# unsubscribe Statement

The `unsubscribe` statement terminates an active stream subscription.

## Syntax

```jsonjet
unsubscribe <subscription_id>
```

## Description

This statement ends a subscription using the ID returned during subscription creation. Once terminated, the subscription stops receiving data and the ID becomes invalid.

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



## Related Statements

- [subscribe](./subscribe.md) - Create a subscription
- [list](./list.md) - List active subscriptions 