/**
 * Minimal demo to test exp() function in select
 */

export const expDemo = `create stream numbers;
create stream results;
create flow exp_test from numbers | select { x: x, exp_x: exp(x) } | insert_into(results);
insert into numbers { x: 0 };
insert into numbers { x: 1 };
insert into numbers { x: 2 };
flush numbers;`;