import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {childEnvironment} from '../app/core/process.mjs';
import {providerEnvironmentPatch,workbuddyEnvironment} from '../app/services/provider-environment.mjs';
import {config} from '../bridges/workbuddy-bridge/src/config.mjs';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {Gateway} from '../app/services/gateway.mjs';
import {normalizeWorkbuddy,variantFor} from '../app/core/catalog.mjs';
test('standalone bridge settings cannot redirect Bridge++ workers or their private state',()=>{
  const external={WORKBUDDY_CLI:'D:/external-bridge/cli.mjs',WORKBUDDY_RUNTIME_DIR:'D:/external-bridge/runtime',WORKBUDDY_REPORTS_DIR:'D:/external-bridge/reports',WORKBUDDY_AUTH_FILE:'D:/external-bridge/auth.json',WORKBUDDY_PORT:'invalid',WORKBUDDY_MODEL:'other-model',WORKBUDDY_TOOL_MODE:'invalid',QODERBRIDGE_CACHE_USAGE:'billing',QODERCNCLI_PATH:'D:/external-bridge/qoder.exe',QODERCN_PERSONAL_ACCESS_TOKEN:'official-credential-fixture'};
  const env=childEnvironment({...external,...providerEnvironmentPatch(external)});
  for(const key of Object.keys(external).filter(key=>key!=='QODERCN_PERSONAL_ACCESS_TOKEN'))assert.equal(env[key],undefined,key);
  assert.equal(env.QODERCN_PERSONAL_ACCESS_TOKEN,external.QODERCN_PERSONAL_ACCESS_TOKEN);
  const privateRoot=resolve('.runtime/isolation-fixture'),settings=config(workbuddyEnvironment(privateRoot,external));
  assert.equal(settings.runtime,privateRoot);assert.equal(settings.reports,resolve(privateRoot,'reports'));assert.equal(settings.cliPath,undefined);assert.ok(!String(settings.authFile).includes('external-bridge'));assert.equal(settings.port,8647);assert.equal(settings.toolMode,'native');
});

test('owned worker process does not inherit standalone bridge overrides',async t=>{
  const keys=['WORKBUDDY_CLI','WORKBUDDY_PORT','QODERBRIDGE_CACHE_USAGE'],saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/provider-env-'));
  const model=normalizeWorkbuddy({id:'fixture',name:'Fixture',contextWindow:200000}),selection={identity:model.identity,contextTokens:200000};
  const gateway=new Gateway({root},{get:()=>model},{command:process.execPath,args:[],env:{}},{workerScript:resolve('tests/fixtures/gateway-worker.mjs')});t.after(()=>gateway.close());
  try{
    for(const key of keys)process.env[key]='external-bridge-fixture';
    const variant=variantFor(model,selection),endpoint=await gateway.register(model,variant,selection,'codex','independent-session');
    const response=await fetch(endpoint.baseURL+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+endpoint.key,'content-type':'application/json'},body:JSON.stringify({model:variant.id,messages:[{role:'user',content:'Local fixture only'}]})});
    assert.equal(response.status,200);assert.deepEqual((await response.json()).bridgeEnvKeys,[]);
  }finally{for(const key of keys)if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
});
