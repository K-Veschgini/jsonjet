# summarize Operator

The `summarize` operator aggregates data with optional grouping, windowing, and emit clauses.

## Syntax

```jsonjet
| summarize { <aggregations> } [by <grouping>] [over <window>]
| summarize { <aggregations> } [by <grouping>] emit <emit_clause>
```

## Description

The `SUMMARIZE` operator performs data aggregation operations, grouping documents by specified fields and applying aggregation functions. It supports time-based and count-based windowing, as well as various emit strategies.

## Parameters

### Aggregations

```jsonjet
{ <aggregation_mappings> }
```

**Aggregation Mappings:**
- `field: function(expression)` - Apply aggregation function to expression
- `field` - Shorthand for `field: function(field)`
- `...*` - Spread all fields from source
- `...expression` - Spread fields from expression result
- `-field` - Exclude field from output

### Grouping

```jsonjet
by field1, field2, ...
```

Groups documents by the specified fields before aggregation.

### Windowing

```jsonjet
over <window_definition>
```

**Window Types:**
- `hopping_window(interval, hop)` - Hopping time window
- `tumbling_window(interval)` - Tumbling time window
- `sliding_window(count)` - Sliding count window
- `session_window(timeout)` - Session-based window

### Emit Clauses

```jsonjet
emit <emit_strategy>
```

**Emit Strategies:**
- `every <interval> [using <expression>]` - Emit at regular intervals
- `when <condition>` - Emit when condition is true
- `on change <expression>` - Emit when expression value changes
- `on group change` - Emit when group changes
- `on update` - Emit on every update

## Examples

### Basic Aggregation

```jsonjet
| summarize { count: count(), avg_temp: avg(temperature) }
| summarize { count(), max(value), min(value) }
| summarize { total: sum(amount), count: count() }
```

### Grouped Aggregation

```jsonjet
| summarize { count: count(), avg_temp: avg(temperature) } by sensor_id
| summarize { total_sales: sum(amount) } by product_id, region
| summarize { error_count: count() } by error_type, severity
```

### Field Spreading and Exclusion

```jsonjet
| summarize { ...*, count: count() } by user_id
| summarize { ...*, -internal_field, total: sum(value) } by category
| summarize { ...user, login_count: count() } by user.id
```

### Time-Based Windowing

```jsonjet
| summarize { count: count() } 
  over hopping_window(5m, 1m)

| summarize { avg_temp: avg(temperature) } 
  over tumbling_window(1h)

| summarize { max_value: max(value) } 
  over session_window(30m)
```

### Count-Based Windowing

```jsonjet
| summarize { avg_value: avg(value) } 
  over sliding_window(100)
```

### Emit Strategies

```jsonjet
| summarize { count: count() } 
  emit every 1m using count()

| summarize { max_temp: max(temperature) } 
  emit when max_temp > 30

| summarize { current_count: count() } 
  emit on change current_count

| summarize { group_total: sum(value) } 
  by category 
  emit on group change
```

### Complex Aggregations

```jsonjet
| summarize {
    count: count(),
    unique_users: count_distinct(user_id),
    total_revenue: sum(amount),
    avg_order: avg(amount),
    max_order: max(amount),
    min_order: min(amount)
  } by product_category
```

### Multi-Level Grouping

```jsonjet
| summarize { 
    daily_sales: sum(amount),
    order_count: count()
  } by date, region, product_type
```

### Conditional Aggregations

```jsonjet
| summarize {
    total_errors: count(),
    critical_errors: count_if(severity = "critical"),
    warning_ratio: count_if(severity = "warning") / count()
  } by service_name
```

### Advanced Window Patterns

```jsonjet
| summarize { 
    moving_avg: avg(temperature) 
  } over hopping_window(10m, 2m)
  by sensor_id

| summarize { 
    session_duration: max(timestamp) - min(timestamp) 
  } over session_window(5m)
  by user_id
```

### Emit with Complex Logic

```jsonjet
| summarize { 
    error_rate: count_if(status = "error") / count() 
  } by service_name
  emit when error_rate > 0.1

| summarize { 
    current_users: count_distinct(user_id) 
  } by minute
  emit every 1m using current_users
```

## Aggregation Functions

### Basic Functions
- `count()` - Count of documents
- `count_distinct(field)` - Count of unique values
- `sum(field)` - Sum of values
- `avg(field)` - Average of values
- `min(field)` - Minimum value
- `max(field)` - Maximum value

### Statistical Functions
- `stddev(field)` - Standard deviation
- `variance(field)` - Variance
- `percentile(field, p)` - Percentile value
- `median(field)` - Median value

### Conditional Functions
- `count_if(condition)` - Count documents matching condition
- `sum_if(field, condition)` - Sum values matching condition
- `avg_if(field, condition)` - Average values matching condition

## Performance Considerations

- Grouping by many fields can impact performance
- Time-based windows require timestamp ordering
- Complex emit conditions are evaluated frequently
- Consider using appropriate window sizes for your use case

## Related Operators

- [WHERE](./where.md) - Filter documents before aggregation
- [SELECT](./select.md) - Transform data before aggregation
- [SCAN](./scan.md) - Stateful processing alternative 