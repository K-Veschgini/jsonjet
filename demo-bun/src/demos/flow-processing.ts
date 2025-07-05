export const flowProcessingDemo = `// JSDB Flow Processing Demo
// Learn how to create flows that process and route data in real-time

// 1. Create streams
create stream events;
create stream archive;

// 2. Create result streams for flow outputs
create stream high_sales_results;
create stream monitor_results;

// 3. Create flows that process and route data
// High value sales flow - writes results to a dedicated stream
create flow high_sales from events | where amount > 100 | insert_into(high_sales_results);

// Also archive high value sales to archive stream
create flow archiver from events | where amount > 100 | insert_into(archive);

// Temporary monitoring flow with TTL (auto-deletes after 2 minutes)
create flow temp_monitor ttl(2m) from events | project { id: id, doubled: amount * 2 } | insert_into(monitor_results);

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

// 7. Delete a flow manually
delete flow temp_monitor;`;