export const scanSimpleDemo = `// Simple Scan Operator Demo - Cumulative Sum
// Shows scan operator maintaining state across events

// 1. Create streams
create or replace stream numbers;
create or replace stream cumulative_results;

// 2. Create cumulative sum flow with proper object emission
create flow cumulative_sum from numbers | scan(step sum: true => sum.total = (sum.total || 0) + x, emit({ input: x, cumulative: sum.total, step: "sum" });) | insert_into(cumulative_results);

// 3. Insert test data - watch cumulative sum grow
insert into numbers { x: 1 };
insert into numbers { x: 2 };
insert into numbers { x: 3 };
insert into numbers { x: 4 };
insert into numbers { x: 5 };

// 4. Check flows and results  
list flows;
flush cumulative_results;`;