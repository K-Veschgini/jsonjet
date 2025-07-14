export const expDemo = `// Demonstrate the exp() scalar function
create stream numbers;
create stream results;

create flow exp_demo as
  numbers | select { x, exp_x: exp(x) } | insert_into(results);

insert into numbers { x: 0 };
insert into numbers { x: 1 };
insert into numbers { x: 2 };

flush numbers;`;