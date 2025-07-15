export const summarizeDemo = `// ResonanceDB Data Summarization Demo
// Learn how to aggregate and summarize streaming data with windows

// 1. Create streams for sales data (using or replace to handle existing streams)
create or replace stream sales;
create or replace stream daily_summary;

// 2. Create summarization flows FIRST
// Summarize total sales by product using a 2-item tumbling window
// Window ensures results are emitted every 2 items automatically
create flow product_summary as
sales 
  | summarize { total_amount: sum(amount), count: count() } by product over window = tumbling_window(2)
  | insert_into(daily_summary);

// 3. Insert sample sales data (flows will process this immediately)
insert into sales { date: "2024-01-15", product: "laptop", amount: 1200, region: "north" };
insert into sales { date: "2024-01-15", product: "mouse", amount: 25, region: "north" };
insert into sales { date: "2024-01-15", product: "laptop", amount: 1100, region: "south" };
insert into sales { date: "2024-01-15", product: "keyboard", amount: 75, region: "south" };

// 4. Wait a moment, then insert more data
// Results will appear in daily_summary stream automatically
insert into sales { date: "2024-01-16", product: "laptop", amount: 1300, region: "north" };
insert into sales { date: "2024-01-16", product: "mouse", amount: 30, region: "east" };
insert into sales { date: "2024-01-16", product: "laptop", amount: 1150, region: "west" };

// 5. Flush the sales stream to emit any remaining summarizations
flush sales;`;