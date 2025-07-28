# Introduction

JSONJet is a document based real-time stream processing engine. It is best explained by a simple example:
```jsonjet
create stream sensor_data;
create stream processed_data;

create flow data_processor as
  sensor_data 
  | where temperature > 25 
  | select { id: id, temp: temperature, alert: true } 
  | insert_into(processed_data);
```

The key concepts here are:

### Stream

A **stream** is a named data pipe that routes documents through the system in real-time. Streams are the primary data routing mechanism in JSONJet and can be created, populated, and subscribed to. Think of streams as pure data pipes - they receive data from external sources and immediately route it to all active subscribers. If no subscribers are listening, the data is lost (this is correct streaming behavior, not a database).

### Flow

A **flow** is a real-time data processing pipeline that continuously processes documents from one input stream and writes to one or more output streams. Flows are the core processing mechanism in JSONJet, transforming raw data into meaningful insights as it arrives. Each flow operates independently and can filter, transform, aggregate, or route data based on your business logic.

Flows can be composed of multiple operators chained together using the pipe operator (`|`). The query language is inspired by [Kusto Query Language (KQL)](https://learn.microsoft.com/en-us/kusto/query/) and the [SQL Pipe syntax suggested by Google](https://research.google/pubs/sql-has-problems-we-can-fix-them-pipe-syntax-in-sql/), providing an intuitive way to express complex data transformations as a series of simple operations.
