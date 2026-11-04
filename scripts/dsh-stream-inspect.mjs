import {Store} from '../app/core/store.mjs';
import {DshHost} from '../app/services/dsh-host.mjs';
import {discoverRuntimes} from '../app/services/runtime-paths.mjs';
import {resolve} from 'node:path';
const store=await new Store(resolve('.runtime/live-dsh')).open(),host=new DshHost(store,(await discoverRuntimes()).find(r=>r.id==='dsh'));
try{const session=store.state.sessions.find(s=>s.nativeId);let stop;stop=await host.follow(session.nativeId,async frame=>{console.log(JSON.stringify({type:frame.type,keys:Object.keys(frame),assistant:frame.assistantStream}));},error=>console.error(error.message));stop();}finally{await host.close();}
