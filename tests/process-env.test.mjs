import {test} from 'node:test';
import assert from 'node:assert/strict';
import {launch} from '../app/core/process.mjs';

const envKeys=options=>new Promise((resolve,reject)=>{
  const child=launch(process.execPath,['-e','process.stdout.write(JSON.stringify(Object.keys(process.env)))'],options);let out='';
  child.stdout.setEncoding('utf8').on('data',data=>{out+=data;});
  child.on('error',reject);
  child.on('close',code=>{if(code!==0)reject(new Error(`synthetic child exited with ${code}`));else{try{resolve(JSON.parse(out));}catch{reject(new Error('synthetic child printed no environment'));}}});
});
const shell={SystemRoot:process.env.SystemRoot??'C:\\Windows',SystemDrive:process.env.SystemDrive??'C:'};

test('launch merges the parent environment unless exactEnv is requested',async t=>{
  const synthetic={BRIDGE_SYNTHETIC_PARENT:'visible',ANTHROPIC_API_KEY:'synthetic-key'},saved=Object.fromEntries(Object.keys(synthetic).map(key=>[key,process.env[key]]));
  Object.assign(process.env,synthetic);t.after(()=>{for(const [key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
  const merged=await envKeys({});
  assert.equal(merged.includes('BRIDGE_SYNTHETIC_PARENT'),true);assert.equal(merged.includes('ANTHROPIC_API_KEY'),true);
  const exact=await envKeys({exactEnv:true,env:{...shell,BRIDGE_SYNTHETIC_EXACT:'1'}});
  assert.equal(exact.includes('BRIDGE_SYNTHETIC_EXACT'),true);
  assert.equal(exact.includes('BRIDGE_SYNTHETIC_PARENT'),false);assert.equal(exact.includes('ANTHROPIC_API_KEY'),false);
});

test('exactEnv keeps its own values but still drops the injected node switches',async()=>{
  const keys=await envKeys({exactEnv:true,env:{...shell,BRIDGE_SYNTHETIC_EXACT:'1',ELECTRON_RUN_AS_NODE:'1',NODE_OPTIONS:'--max-old-space-size=64'}});
  assert.equal(keys.includes('BRIDGE_SYNTHETIC_EXACT'),true);
  assert.equal(keys.includes('ELECTRON_RUN_AS_NODE'),false);assert.equal(keys.includes('NODE_OPTIONS'),false);
});
