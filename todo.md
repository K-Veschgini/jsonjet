need now() func
need warning or error when monotonic assumed fields are not monotonic. 
better erros also when query fails, what query exactly. 

streams dont apepar in ui on create but on insert.

undefined must not appear in docs.

delete all stram shall not touch _ streams

remove flush // _log, numbers, results from console and add a real flush all?

large number of streams, no space for docs view

make sure functions (aggs and sclaras dont have same name and not called like a built in operator)




command parser is weird. why not use grammar?

when i misspell a stage in pipe there is no error


// Simple Scan Operator Demo - Cumulative Sum
// Equivalent to: range x from 1 to 5 | scan declare (cumulative_x:long=0) with (step s1: true => cumulative_x = x + s1.cumulative_x;)

// 1. Create streams
create or replace stream numbers;
create or replace stream cumulative_results;

// 2. Create cumulative sum flow
create flow cumulative_sum as
numbers
  | insert_into(cumulative_results)
  | scan(
      step s1: true => 
        s1.cumulative_x = x + iff(s1.cumulative_x, s1.cumulative_x, 0),
        emit({
          x: x,
          cumulative_x: s1.cumulative_x
        });
    )
  | insert_into(cumulative_results);

// 3. Insert test data (simulating range x from 1 to 5)
insert into numbers { x: 1 };
insert into numbers { x: 2 };
insert into numbers { x: 3 };
insert into numbers { x: 4 };
insert into numbers { x: 5 };

// 4. Check results
flush numbers;


this.command = this.RULE("command", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.printCommand) }
        ]);
    });

    this.printCommand = this.RULE("printCommand", () => {
        this.CONSUME(Print);
        this.SUBRULE(this.expression);
    });
}


batch-query engine and query engine

reconstructFlowPipeline



const CONTEXT_SENSITIVE_KEYWORDS = new Set([
'create', 'delete', 'insert', 'flush', 'list', 'info',
'subscribe', 'unsubscribe', 'where', 'select', 'scan',
'summarize', 'collect', 'by', 'step', 'iff', 'emit',
'stream', 'flow', 'or', 'replace', 'if', 'not', 'exists',
'into', 'ttl', 'as', 'print', 'every', 'when', 'on',
'change', 'group', 'update', 'using', 'over',
'hopping_window', 'tumbling_window', 'sliding_window',
'count_window', 'hopping_window_by', 'tumbling_window_by',
'sliding_window_by', 'session_window'
]);