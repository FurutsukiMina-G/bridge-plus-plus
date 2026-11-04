// Read-only, offline inspection. Never sends prompts to a model.
import {readFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {discoverRuntimes} from '../app/services/runtime-paths.mjs';
const runtimes=await discoverRuntimes(),dsh=runtimes.find(r=>r.id==='dsh');
const s=dsh?.executable?await readFile(join(dirname(dsh.executable),'resources/app.asar'),'utf8'):'';
const seen=new Set();
for(const m of s.matchAll(/"declaration": ("(?:[^"\\]|\\.)*")/g)){
  const d=JSON.parse(m[1]);
  if(/^(export )?(interface|type) (ApprovalOutcome|SessionPromptRequest|PromptContentPart|ImageBlock|ImageAttachmentRef|SessionAttachmentRequest)\b/.test(d)&&!seen.has(d)){seen.add(d);console.log(d);}
}
for(const key of ['escalate sandbox to','"$events/result"','async attachment(request)']){
 const i=s.indexOf(key);if(i>=0)console.log(key,s.slice(Math.max(0,i-80),i+1100));
}
const runtime=runtimes.find(r=>r.id==='codex');
if(!runtime?.executable)throw new Error('Codex executable unavailable');
const out='.runtime/media-schema';await mkdir(out,{recursive:true});
console.log(execFileSync(runtime.executable,['--version'],{encoding:'utf8'}));
execFileSync(runtime.executable,['app-server','generate-json-schema','--out',out]);
const schema=JSON.parse(await readFile(out+'/v2/TurnStartParams.json','utf8'));
console.log('UserInput',JSON.stringify(schema.definitions?.UserInput));
