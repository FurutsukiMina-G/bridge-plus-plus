import {test} from 'node:test';
import assert from 'node:assert/strict';
import {limitNotice,rateLimited,resetText,sameUpstream,stopLabel,stopNote,upstreamHtml,upstreamText,upstreamTitle} from '../app/ui/upstream.js';
import {serviceCardHtml} from '../app/ui/setup.js';
import {ActivityTracker} from '../app/ui/activity.js';
import {displayEvents} from '../app/ui/view-state.js';

const now=new Date(2026,10,4,20,0,0).getTime();
const at=(d,h,m)=>new Date(2026,10,d,h,m,0).toISOString();
const limit={id:'e1',provider:'workbuddy',model:'Kimi-K3.1-Pro',status:429,code:'upstream_rate_limited',message:'您的使用量已超出频率限制',resetAt:at(5,0,6),requestId:'req-1',retrying:false};

test('a limit reads as a limit, anything else as an upstream error',()=>{
  assert.equal(upstreamTitle(limit),'上游限速');
  assert.equal(rateLimited({code:'upstream_rate_limit'}),true);
  assert.equal(upstreamTitle({status:502,code:'upstream_failure'}),'上游报错');
});

test('the reset time is in the user clock, with how long is left',()=>{
  assert.equal(resetText(at(5,0,6),now),'11 月 5 日 00:06 重置（约 4 小时后）');
  assert.equal(resetText(at(4,20,30),now),'20:30 重置（约 30 分钟后）');
  assert.equal(resetText(at(4,19,30),now),'19:30 已重置');
  assert.equal(resetText(undefined,now),'');
  assert.equal(resetText('not a date',now),'');
});

test('the card shows the upstream words, where it came from and the diagnosis, escaped',()=>{
  const html=upstreamHtml({...limit,message:'<b>限速</b>'},3,now);
  assert.match(html,/上游限速/);
  assert.match(html,/WorkBuddy · Kimi-K3\.1-Pro · HTTP 429/);
  assert.match(html,/&lt;b&gt;限速&lt;\/b&gt;/);
  assert.match(html,/×3/);
  assert.match(html,/00:06 重置/);
  assert.match(html,/请求 ID：req-1/);
  assert.doesNotMatch(upstreamHtml(limit,1,now),/upstream-count/);
  assert.match(upstreamHtml({id:'x'},1,now),/上游没有说明原因/);
});

test('the status code the upstream leads with is not repeated in its words',()=>{
  assert.equal(upstreamText({message:'429 您的使用量已超出频率限制'}),'您的使用量已超出频率限制');
  assert.equal(upstreamText({message:'HTTP 502 Bad Gateway'}),'Bad Gateway');
  assert.equal(upstreamText({message:'2026 年的额度已用完'}),'2026 年的额度已用完');
  assert.equal(upstreamText(undefined),'');
});

test('repeats of one cause merge, a different cause does not',()=>{
  assert.equal(sameUpstream(limit,{...limit,id:'e2',requestId:'req-2'}),true);
  assert.equal(sameUpstream(limit,{...limit,message:'别的原因'}),false);
  assert.equal(sameUpstream(undefined,limit),false);
});

test('the closing line names the cause and the full text appears once',()=>{
  assert.equal(stopLabel({kind:'upstream',status:429,code:'upstream_rate_limited'}),'上游限速');
  assert.equal(stopLabel({kind:'upstream',code:'upstream_failure'}),'上游报错');
  assert.equal(stopLabel({kind:'runtime'}),'原生进程中断');
  assert.equal(stopLabel({kind:'unfinished'}),'模型没有给出结果');
  assert.equal(stopLabel(undefined),'');
  const reason={kind:'runtime',message:'Kimi Code 退出（代码 1）'};
  assert.equal(stopNote(reason),reason.message);
  assert.equal(stopNote(reason,new Set([reason.message])),'','already said above');
  assert.equal(stopNote({kind:'cancelled',message:'用户停止'}),'','stopping it yourself needs no explaining');
  assert.equal(stopNote(undefined),'');
});

test('a known limit warns next to the composer only until it lifts',()=>{
  const failure={kind:'upstream',source:'WorkBuddy',resetAt:at(5,0,6)};
  assert.match(limitNotice(failure,now),/^WorkBuddy 限速中，11 月 5 日 00:06 重置/);
  assert.equal(limitNotice(failure,new Date(2026,10,5,1,0).getTime()),'');
  assert.equal(limitNotice({kind:'runtime',resetAt:at(5,0,6)},now),'');
  assert.equal(limitNotice(undefined,now),'');
});

test('upstream errors are kept in the transcript and show as the current activity',()=>{
  assert.equal(displayEvents([{type:'upstream-error',id:'1',message:'x'}]).length,1);
  const tracker=new ActivityTracker();
  tracker.feed({type:'user',at:new Date(now).toISOString()},'s');
  tracker.feed({type:'upstream-error',retrying:true,message:'您的使用量已超出频率限制'},'s');
  const state=tracker.describe('s','running',{});
  assert.equal(state.long,'上游报错，等待重试');
  assert.match(state.detail,/频率限制/);
});

test('an interface card shows the last failure in the upstream words, until it is a day old',()=>{
  const card=lastError=>serviceCardHtml({id:'workbuddy',name:'Bridge++_WorkBuddy',source:'workbuddy',status:'running',port:8647,requests:{total:3,failed:1,lastError}});
  const fresh={code:'upstream_rate_limited',status:429,message:'您的使用量已超出频率限制',model:'Kimi-K3.1-Pro',at:new Date().toISOString()};
  assert.match(card(fresh),/最近失败/);
  assert.match(card(fresh),/您的使用量已超出频率限制/);
  assert.match(card(fresh),/HTTP 429/);
  assert.doesNotMatch(card({...fresh,at:new Date(Date.now()-2*864e5).toISOString()}),/最近失败/);
  assert.doesNotMatch(card(undefined),/最近失败/);
});
