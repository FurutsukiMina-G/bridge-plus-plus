import {readFileSync} from 'node:fs';
const args=process.argv.slice(2),prompt=readFileSync(0,'utf8'),emit=m=>process.stdout.write(JSON.stringify(m)+'\n');
const resume=args.indexOf('resume'),id=resume>=0?args[resume+1]:'native-exec-fixture';
const exitErrors={
 'active-writer':`ERROR codex_core::session::session: failed to initialize thread persistence: thread-store conflict: thread ${id} already has an active writer\nERROR codex_core::session: Failed to create session: thread-store conflict: thread ${id} already has an active writer\nError: thread/resume: thread/resume failed: thread ${id} already has an active writer (code -32600)\n`,
 'thread-store-conflict':'ERROR codex_core::session: Failed to create session: thread-store conflict\n',
 'no-rollout':`Error: thread/resume: thread/resume failed: no rollout found for thread id ${id} (code -32600)\n`,
 'tls':'ERROR codex_api: invalid peer certificate: UnknownIssuer\n'
};
const exitError=prompt==='active-writer-fatal'?exitErrors['active-writer']:exitErrors[prompt];
if(exitError){if(prompt==='active-writer-fatal')emit({type:'error',message:'thread-store conflict'});process.stderr.write(exitError);process.exitCode=1;}
else{
emit({type:'thread.started',thread_id:id});emit({type:'turn.started'});
if(prompt==='hold'){setInterval(()=>{},1000);}
else if(prompt==='fail'){emit({type:'turn.failed',error:{message:'fixture failure'}});process.exitCode=1;}
else if(prompt==='incomplete'){}
else{
 if(prompt==='warnings')for(let n=0;n<2;n++)emit({type:'item.completed',item:{id:'warning_'+n,type:'error',message:'Codex is ignoring 1 unrecognized configuration setting: disable_response_storage is ignored.'}});
 if(prompt==='fatal')emit({type:'error',message:'fixture unrecoverable error'});
 emit({type:'item.completed',item:{id:'message',type:'agent_message',text:JSON.stringify({args,prompt})}});
 if(prompt==='media')emit({type:'item.completed',item:{id:'image',type:'image_generation',result:Buffer.alloc(5*1024*1024).toString('base64')}});
 emit({type:'turn.completed',usage:{input_tokens:2,cached_input_tokens:1,output_tokens:3}});
 if(prompt==='linger')setTimeout(()=>{},250);
}
}
