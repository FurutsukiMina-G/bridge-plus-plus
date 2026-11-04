import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cacheUsage,usageForDisplay} from '../app/services/usage-view.mjs';
import {SessionMetrics} from '../app/ui/metrics.js';
test('cache counts are paired with the same request and derived values remain estimated',()=>{
  assert.deepEqual(cacheUsage({prompt_tokens:100},{cached_tokens:199,cache_status:'estimated'}),{cached_tokens:null,cache_status:'not_reported',cache_validation:'outside_prompt'});
  assert.deepEqual(cacheUsage({prompt_tokens:100,prompt_tokens_details:{cached_tokens:90}},{cache_status:'estimated'}),{cached_tokens:90,cache_status:'estimated'});
  assert.deepEqual(cacheUsage({prompt_tokens:100,prompt_tokens_details:{cached_tokens:90}},null),{cached_tokens:90,cache_status:'reported'});
  assert.equal(cacheUsage({prompt_tokens:100,prompt_tokens_details:{cached_tokens:101}},{cached_tokens:80}).cached_tokens,null);
  assert.deepEqual(cacheUsage({prompt_tokens:100},null),{cached_tokens:null,cache_status:'not_reported'});
});
test('Qoder historical prefix estimates are not presented as observed hits and raw journals stay intact',()=>{
  const original={type:'usage',source:'gateway',data:{prompt_tokens:1000,completion_tokens:5,cached_tokens:1990,cache_status:'estimated'}},before=structuredClone(original);
  const view=usageForDisplay(original,'qoder');assert.deepEqual(original,before);assert.equal(view.data.cached_tokens,null);assert.equal(view.data.cache_status,'not_reported');assert.equal(view.data.discarded_cache_tokens,1990);
  const metric=new SessionMetrics();for(const cached of [900,1990])metric.feed(usageForDisplay({...original,data:{...original.data,cached_tokens:cached}},'qoder'));assert.equal(metric.cache(),null);
  const reported={...original,data:{...original.data,cached_tokens:750,cache_status:'reported'}};assert.equal(usageForDisplay(reported,'qoder'),reported);metric.feed(reported);assert.equal(metric.cache().ratio,0.75);
});
test('other sources keep real cache reads while impossible values become unknown',()=>{
  const reported={type:'usage',data:{prompt_tokens:100,cached_tokens:80,cache_status:'reported'}};assert.equal(usageForDisplay(reported,'workbuddy'),reported);
  const invalid={...reported,data:{...reported.data,prompt_tokens_details:{cached_tokens:150},cached_tokens:150}};const view=usageForDisplay(invalid,'workbuddy');assert.equal(view.data.cached_tokens,null);assert.equal(view.data.prompt_tokens_details.cached_tokens,null);
});
