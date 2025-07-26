export const flowProcessingDemo = `// JSONJet Flow Processing Demo
// Learn how to create flows that process and route data in real-time

// 1. Create streams (using or replace to handle existing streams)
create or replace stream events;
create or replace stream archive;

// 2. Create result streams for flow outputs
create or replace stream high_sales_results;
create or replace stream monitor_results;

// 3. Create flows that process and route data
// High value sales flow - writes results to a dedicated stream
create flow high_sales as
events | where amount > 100 | insert_into(high_sales_results);

// Also archive high value sales to archive stream
create flow archiver as
events | where amount > 100 | insert_into(archive);

// Temporary monitoring flow with TTL (auto-deletes after 2 minutes)
create flow temp_monitor ttl(2m) as
events | select { id: id, doubled: amount * 2 } | insert_into(monitor_results);

// 4. Insert data to see it flow through the system
insert into events { id: 1, amount: 150, type: "sale" };
insert into events [
  { id: 2, amount: 50, type: "refund" },
  { id: 3, amount: 200, type: "sale" }
];

// 5. Insert more data and see it flow through
insert into events { id: 4, amount: 300, type: "sale" };

// 6. List active flows
list flows;

// 7. Flows with TTL will auto-delete after their timeout
// The temp_monitor flow will auto-delete after 2 minutes`;