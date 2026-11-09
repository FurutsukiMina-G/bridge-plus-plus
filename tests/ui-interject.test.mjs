import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ActivityTracker} from '../app/ui/activity.js';
import {displayEvents} from '../app/ui/view-state.js';

const run=(events,status='running')=>{const a=new ActivityTracker();for(const e of events)a.feed({sessionId:'s',...e});return a.describe('s',status);};

test('a message added mid-turn does not restart the running turn',()=>{
  const busy=run([{type:'user',text:'go'},{type:'tool-start',toolId:'c1',name:'commandExecution',data:{command:'npm test'}},{type:'user',text:'也改 README',delivery:'steer',steerId:'st1'}]);
  assert.deepEqual([busy.long,busy.detail],['正在运行命令','npm test']);
  // A queued message that goes out after the turn is a new turn as before.
  assert.equal(run([{type:'user'},{type:'text',text:'x'},{type:'turn-end',status:'completed'},{type:'user',text:'next',fromQueue:['q1']}]).long,'等待模型响应');
});

test('where a mid-turn message went is kept for the transcript',()=>{
  const shown=displayEvents([
    {type:'user',id:'u1',turnId:'t',text:'改 README',delivery:'steer',steerId:'st1'},
    {type:'steer-state',id:'s1',turnId:'t',steerId:'st1',state:'delivered'},
    {type:'native-event',id:'n1',name:'agent/inbox/spliced'},
  ]);
  assert.deepEqual(shown.map(e=>e.type),['user','steer-state']);
});
