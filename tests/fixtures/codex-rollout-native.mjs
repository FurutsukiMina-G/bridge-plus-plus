import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const [home,threadId,mode]=process.argv.slice(2);readFileSync(0,'utf8');
const record=JSON.parse(readFileSync(new URL('./codex-image-extension.json',import.meta.url),'utf8'));record.payload.thread_id=threadId;
if(mode==='saved'){
  const dir=join(home,'generated_images',threadId);mkdirSync(dir,{recursive:true});record.payload.item.savedPath=join(dir,'generated.data');writeFileSync(record.payload.item.savedPath,Buffer.from(record.payload.item.result,'base64'));record.payload.item.result=null;
}
const day=join(home,'sessions/2026/11/03');mkdirSync(day,{recursive:true});writeFileSync(join(day,'rollout-fixture-'+threadId+'.jsonl'),JSON.stringify(record)+'\n'+JSON.stringify(record)+'\n');
for(const event of [{type:'thread.started',thread_id:threadId},{type:'turn.started'},{type:'item.completed',item:{id:'answer',type:'agent_message',text:''}},{type:'turn.completed',usage:{input_tokens:1,output_tokens:1}}])process.stdout.write(JSON.stringify(event)+'\n');
