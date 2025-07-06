export const scanDemo = `// JSDB Stream Scanning Demo
// Learn how to scan and filter data streams in real-time

// 1. Create monitoring streams (using or replace to handle existing streams)
create or replace stream server_logs;
create or replace stream alerts;
create or replace stream metrics;

// 2. Create scanning flows for monitoring FIRST
// Scan for errors and create alerts
create flow error_scanner from server_logs 
  | where level == "error" 
  | select { alert_type: "ERROR", service: service, message: message, time: timestamp }
  | insert_into(alerts);

// Scan for slow responses and create performance metrics
create flow performance_scanner from server_logs 
  | where response_time > 1000 
  | select { metric_type: "SLOW_RESPONSE", service: service, response_time: response_time }
  | insert_into(metrics);

// 3. Insert various log entries (flows will process these immediately)
insert into server_logs { timestamp: "2024-01-15T10:00:00Z", level: "info", service: "api", message: "Request processed", response_time: 45 };
insert into server_logs { timestamp: "2024-01-15T10:01:00Z", level: "warning", service: "db", message: "Slow query detected", response_time: 2500 };
insert into server_logs { timestamp: "2024-01-15T10:02:00Z", level: "error", service: "api", message: "Connection timeout", response_time: 5000 };

// 4. Insert more log data to trigger scans
insert into server_logs { timestamp: "2024-01-15T10:03:00Z", level: "error", service: "auth", message: "Authentication failed", response_time: 200 };
insert into server_logs { timestamp: "2024-01-15T10:04:00Z", level: "info", service: "api", message: "Health check", response_time: 15 };

// 5. Check what was detected
list flows;`;