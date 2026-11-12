import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readUsage,estimateTokens,SessionMetrics} from '../app/ui/metrics.js';

test('usage readers normalize gateway, Codex, Anthropic and pi-ai layouts with cached tokens inside the prompt',()=>{
  assert.deepEqual(readUsage({prompt_tokens:20000,completion_tokens:500,cached_tokens:15000,cache_status:'reported',context_window:200000,first_token_ms:300,duration_ms:2300}),
    {input:20000,output:500,cached:15000,reasoning:null,window:200000,cacheStatus:'reported',firstTokenMs:300,durationMs:2300,credits:null});
  assert.equal(readUsage({prompt_tokens:100,completion_tokens:5,credits:0.36}).credits,0.36,'Qoder metering rides along');
  assert.equal(readUsage({prompt_tokens:100,completion_tokens:5,prompt_tokens_details:{cached_tokens:64}}).cached,64);
  assert.equal(readUsage({prompt_tokens:100,completion_tokens:5,cached_tokens:50,cache_status:'estimated'}).cacheStatus,'estimated');
  const codex=readUsage({last:{inputTokens:31200,cachedInputTokens:27648,outputTokens:420,reasoningOutputTokens:180},modelContextWindow:1000000});
  assert.deepEqual([codex.input,codex.cached,codex.output,codex.reasoning,codex.window],[31200,27648,420,180,1000000]);
  const anthropic=readUsage({input_tokens:10,cache_read_input_tokens:900,cache_creation_input_tokens:90,output_tokens:7});
  assert.deepEqual([anthropic.input,anthropic.cached,anthropic.output],[1000,900,7]);
  const pi=readUsage({input:40,output:3,cacheRead:960,cacheWrite:0});
  assert.deepEqual([pi.input,pi.cached],[1000,960]);
  assert.equal(readUsage({prompt_tokens:100,completion_tokens:2}).cacheStatus,'not_reported');
  assert.equal(readUsage({foo:1}),null);
  assert.equal(readUsage(null),null);
});

test('session metrics report context fill, last and cumulative cache hits, and measured or estimated speed',()=>{
  const m=new SessionMetrics(),at=ms=>new Date(Date.UTC(2026,9,28,12,0,0)+ms).toISOString();
  assert.deepEqual(m.context(200000),{used:null,window:200000,ratio:null});
  assert.equal(m.cache(),null);
  m.feed({type:'native-event',name:'request/context',data:{contextWindow:128000},at:at(0)});
  m.feed({type:'text',text:'hello world, streaming text',turnId:'t1',at:at(100)});
  m.feed({type:'text',text:'more streamed output here',turnId:'t1',at:at(1100)});
  m.feed({type:'usage',data:{prompt_tokens:12000,completion_tokens:400,cached_tokens:6000},turnId:'t1',at:at(1200)});
  assert.deepEqual(m.context(200000),{used:12400,window:128000,ratio:12400/128000});
  assert.equal(m.rate(Date.parse(at(60000))).value,400);
  m.feed({type:'usage',data:{prompt_tokens:20000,completion_tokens:100,cached_tokens:18000,context_window:200000,first_token_ms:500,duration_ms:1500},turnId:'t2',at:at(5000)});
  const cache=m.cache();
  assert.equal(cache.ratio,0.9);
  assert.equal(cache.sessionRatio,24000/32000);
  assert.equal(m.context(null).window,200000);
  assert.equal(m.rate(Date.parse(at(60000))).value,100);
  assert.equal(m.rate(Date.parse(at(60000))).estimated,false);
  assert.deepEqual(m.turn('t1'),{requests:1,input:12000,output:400,cacheRatio:0.5,cacheStatus:'reported'});
  m.feed({type:'thinking',text:'思考中的流式文字',turnId:'t3',at:at(9000)});
  m.feed({type:'thinking',text:'继续输出更多内容',turnId:'t3',at:at(9500)});
  const live=m.rate(Date.parse(at(10000)),true);
  assert.equal(live.estimated,true);assert.equal(live.live,true);assert.ok(live.value>0);
  m.feed({type:'usage',scope:'native-session',data:{input_tokens:10,output_tokens:2},at:at(11000)});
  assert.equal(m.requests.length,2);
  m.clear();
  assert.equal(m.lastRequest(),null);
  assert.ok(estimateTokens('中文字符')>estimateTokens('abcd'));
});

test('the context ring and the latest cache figure follow the main conversation, not the auxiliary requests between its steps',()=>{
  const m=new SessionMetrics(),at='2026-11-11T00:00:00.000Z';
  const usage=(prompt,cached,extra={})=>m.feed({type:'usage',at,turnId:'t1',data:{prompt_tokens:prompt,completion_tokens:100,cached_tokens:cached,cache_status:'reported',context_window:200000,...extra}});
  usage(87000,86000);usage(9000,0,{auxiliary:true});
  assert.equal(m.context(200000).used,87100);
  assert.equal(m.cache().ratio,86000/87000);
  assert.equal(m.cache().sessionRatio,86000/96000);
  usage(90000,89000);usage(9500,0,{auxiliary:true});usage(9400,0,{auxiliary:true});
  assert.equal(m.context(200000).used,90100);
  // A session that so far only made auxiliary requests still shows them rather than nothing.
  const only=new SessionMetrics();only.feed({type:'usage',at,data:{prompt_tokens:5000,completion_tokens:20,auxiliary:true}});
  assert.equal(only.context(200000).used,5020);
});

test('speed and the turn cache ratio follow the main conversation too, falling back to auxiliary requests only when alone',()=>{
  const m=new SessionMetrics(),at='2026-11-11T00:00:00.000Z';
  const usage=(prompt,cached,extra={})=>m.feed({type:'usage',at,turnId:'t1',data:{prompt_tokens:prompt,completion_tokens:1000,cached_tokens:cached,cache_status:'reported',context_window:200000,...extra}});
  usage(80000,72000,{first_token_ms:1000,duration_ms:11000});usage(6000,0,{auxiliary:true,first_token_ms:100,duration_ms:600});
  assert.equal(m.rate().value,100);
  assert.equal(m.turn('t1').cacheRatio,0.9);
  assert.equal(m.turn('t1').requests,2);
  assert.equal(m.turn('t1').input,86000);
  const only=new SessionMetrics();only.feed({type:'usage',at,turnId:'t9',data:{prompt_tokens:6000,completion_tokens:1000,cached_tokens:3000,cache_status:'reported',auxiliary:true,first_token_ms:100,duration_ms:600}});
  assert.equal(only.rate().value,2000);
  assert.equal(only.turn('t9').cacheRatio,0.5);
});

test('session totals add every request up to a turn end, side requests and partial credits included',()=>{
  const m=new SessionMetrics(),at=ms=>new Date(Date.UTC(2026,10,12,12,0,0)+ms).toISOString(),end=ms=>Date.parse(at(ms));
  assert.equal(m.totalUntil(end(0)),null);
  m.feed({type:'usage',turnId:'t1',at:at(1000),data:{prompt_tokens:10000,completion_tokens:200,credits:0.3}});
  m.feed({type:'usage',turnId:'t1',at:at(2000),data:{prompt_tokens:12000,completion_tokens:300,credits:0.36}});
  m.feed({type:'turn-end',turnId:'t1',at:at(2500)});
  // The long-term-rule check of the first message lands after the turn ended; it counts toward the next total.
  m.feed({type:'usage',at:at(3000),data:{prompt_tokens:800,completion_tokens:40,auxiliary:true,credits:0.02}});
  m.feed({type:'usage',turnId:'t2',at:at(4000),data:{prompt_tokens:13000,completion_tokens:100}});
  const first=m.totalUntil(end(2500));
  assert.deepEqual({...first,credits:Number(first.credits.toFixed(2))},{requests:2,input:22000,output:500,credits:0.66,creditsPartial:false});
  const second=m.totalUntil(end(4500));
  assert.equal(second.requests,4);assert.equal(second.input,35800);assert.equal(second.output,640);
  assert.equal(Number(second.credits.toFixed(2)),0.68);assert.equal(second.creditsPartial,true,'a request without metering is outside the credit sum');
  const tokensOnly=new SessionMetrics();tokensOnly.feed({type:'usage',turnId:'w',at:at(1000),data:{prompt_tokens:500,completion_tokens:20}});
  assert.deepEqual(tokensOnly.totalUntil(end(2000)),{requests:1,input:500,output:20,credits:null,creditsPartial:false});
  // Native runtimes report a running session figure: each turn end shows the one current at that time.
  const native=new SessionMetrics();
  native.feed({type:'usage',scope:'native-session',at:at(1000),data:{last:{inputTokens:5000,outputTokens:100}}});
  native.feed({type:'usage',scope:'native-session',at:at(3000),data:{last:{inputTokens:9000,outputTokens:300}}});
  assert.equal(native.totalUntil(end(2000)).input,5000);assert.equal(native.totalUntil(end(4000)).output,300);assert.equal(native.totalUntil(end(500)),null);
});
