import {test} from 'node:test';
import assert from 'node:assert/strict';
import {budgetCheck,compactTokens,formatTokens,parseTokens} from '../app/ui/tokens.js';

test('budgets can be typed the way people say them',()=>{
  assert.equal(parseTokens('900K'),900000);
  assert.equal(parseTokens('900k'),900000);
  assert.equal(parseTokens('1M'),1000000);
  assert.equal(parseTokens('0.75M'),750000);
  assert.equal(parseTokens('.5m'),500000);
  assert.equal(parseTokens('90万'),900000);
  assert.equal(parseTokens(' 786,432 '),786432);
  assert.equal(parseTokens('786432 tokens'),786432);
  assert.equal(parseTokens('200 K'),200000);
  assert.equal(parseTokens(''),null);
  assert.equal(parseTokens('   '),null);
  assert.ok(Number.isNaN(parseTokens('1G')));
  assert.ok(Number.isNaN(parseTokens('-5K')));
  assert.ok(Number.isNaN(parseTokens('abc')));
  assert.ok(Number.isNaN(parseTokens('1.2.3K')));
});

test('K and M follow the sources: a 1M budget fits a 1M window',()=>{
  // Qoder declares {"1M":{"token_count":1000000}}; a 1,024-based "1M" would be 1,048,576 and too big.
  assert.equal(parseTokens('1M'),1000000);
  assert.equal(budgetCheck('1M',{max:1000000}).ok,true);
  assert.equal(budgetCheck('200K',{max:200000}).ok,true);
});

test('an input shows the exact value, so reading it back changes nothing',()=>{
  for(const n of [900000,1000000,1500000,1234000,786432,4096,200000,96000])assert.equal(parseTokens(formatTokens(n)),n,String(n));
  assert.equal(formatTokens(900000),'900K');
  assert.equal(formatTokens(1000000),'1M');
  assert.equal(formatTokens(1500000),'1.5M');
  assert.equal(formatTokens(786432),'786432');
  assert.equal(formatTokens(null),'');
});

test('labels round for reading',()=>{
  assert.equal(compactTokens(1000000),'1M');
  assert.equal(compactTokens(786432),'786.4K');
  assert.equal(compactTokens(164000),'164K');
  assert.equal(compactTokens(null),'—');
});

test('the budget check says what it will be or why not',()=>{
  assert.deepEqual(budgetCheck('900K',{max:1000000}),{ok:true,value:900000,text:'= 900,000 tokens'});
  assert.equal(budgetCheck('',{max:1000000}).ok,true);
  assert.equal(budgetCheck('',{max:1000000}).value,null);
  assert.match(budgetCheck('2M',{max:1000000}).text,/不能超过上下文窗口 1M/);
  assert.match(budgetCheck('4K',{max:1000000}).text,/至少 4,096/);
  assert.match(budgetCheck('1G',{max:1000000}).text,/没看懂/);
});
