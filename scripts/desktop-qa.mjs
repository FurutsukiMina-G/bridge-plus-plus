import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {runRegression} from './desktop-regression.mjs';
export async function run({window,methods,store}){
  const out=resolve('.runtime/desktop-artifacts');await mkdir(out,{recursive:true});const errors=[];window.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
  const wait=(ms=250)=>new Promise(resolve=>setTimeout(resolve,ms));const js=code=>window.webContents.executeJavaScript(code,true);
  const capture=async name=>{await wait();await writeFile(join(out,`${name}.png`),(await window.webContents.capturePage()).toPNG());};
  const click=async selector=>{await js(`document.querySelector(${JSON.stringify(selector)}).click()`);await wait(120);};
  const pickEnv=async id=>{await click('#env-chip');await click(`[data-env="${id}"]`);};
  const escape=()=>js('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))');
  await wait();assert.equal(await js('!!window.workbench'),true);assert.match(await js('document.body.textContent'),/今天想构建什么/);assert.equal(await js('document.title'),'Bridge++');await capture('01-workspace');
  const catalogs=JSON.parse(await readFile(resolve('.runtime/probe/workspace.json'),'utf8')).catalog;
  await store.mutate(s=>{s.catalog=catalogs;});await wait();
  const modelCount=Object.values(catalogs).reduce((n,c)=>n+(c.models?.length??0),0);
  await click('#open-settings');await click('[data-settings-tab="sources"]');assert.equal(await js('document.querySelectorAll("#model-rows tr").length'),modelCount);assert.equal(await js('document.querySelectorAll(".source-card").length'),3);await capture('02-model-catalog');
  const gemini=catalogs.antigravity?.models?.find(m=>m.id==='gemini-3.8-flash-low');
  if(gemini){
    await click(`[data-use-model="${gemini.key}"]`);
    assert.equal(await js('document.querySelector("#env-chip").dataset.value'),'antigravity');assert.equal(await js('document.querySelector("#model-chip").dataset.value'),gemini.key);
    assert.match(await js('document.querySelector("#composer-controls").textContent'),new RegExp(gemini.name.replace(/[()]/g,'\\$&')));await capture('08-gemini-native');
    await pickEnv('codex');assert.notEqual(await js('document.querySelector("#model-chip").dataset.value'),gemini.key);
  }
  await pickEnv('codex');await click('#model-chip');await click('[data-model-key="native"]');
  await js('{const el=document.querySelector("#native-id");el.value="gpt-5.5";el.dispatchEvent(new Event("input"));}');await click('#load-native-models');
  for(let i=0;i<120;i++){if(await js('!!document.querySelector("#load-native-models")&&!document.querySelector("#load-native-models").disabled'))break;await wait();}
  const expectedNative=await methods['native:models']({runtimeId:'codex'});
  const pickerIds=await js('[...(document.querySelector("#native-model-choice")?.options??[])].map(o=>o.value).filter(Boolean)');
  assert.deepEqual(pickerIds.sort(),expectedNative.map(m=>m.id).sort());assert.equal(await js('document.querySelector("#native-id").value'),'gpt-5.5');
  const preferred=expectedNative.find(m=>!m.hidden&&m.reasoning.includes('ultra'))??expectedNative.find(m=>!m.hidden);
  if(preferred){
    await js(`{const el=document.querySelector("#native-model-choice");el.value=${JSON.stringify(preferred.id)};el.dispatchEvent(new Event("change"));}`);
    assert.equal(await js('document.querySelector("#native-id").value'),preferred.id);
    assert.deepEqual((await js('[...document.querySelector("#native-effort").options].map(o=>o.value).filter(Boolean)')).sort(),[...preferred.reasoning].sort());
  }
  await capture('09-codex-native-models');await escape();await wait();
  await click('#open-settings');await click('[data-settings-tab="runtimes"]');assert.equal(await js('document.querySelectorAll(".runtime-card").length'),4);await capture('03-runtimes');await click('#close-settings');
  await click('[data-rtab="files"]');assert.equal(await js('!!document.querySelector("#tree")||!!document.querySelector("#rp-body .pane-empty")'),true);await capture('04-files');
  await click('[data-rtab="changes"]');await capture('05-git-review');
  await click('[data-rtab="tasks"]');assert.equal(await js('!!document.querySelector("#terminal-command")'),true);await capture('06-terminal');
  await click('#open-settings');await capture('07-settings');
  const theme=store.state.preferences.theme??'dark';await click('[data-theme-choice="light"]');await wait(400);assert.equal(await js('document.documentElement.dataset.theme'),'light');await click('#close-settings');await capture('15-light-theme');
  await methods['preference:theme']({theme});await wait(300);
  const regressions=await runRegression({window,methods,store,capture});
  const call=(method,args={})=>js(`window.workbench.call(${JSON.stringify(method)},${JSON.stringify(args)})`);
  const initial=await call('snapshot');assert.equal(initial.ok,true);assert.equal(initial.value.runtimes.length,4);
  for(const runtime of initial.value.runtimes){assert.ok(runtime.permissions);assert.ok(Array.isArray(runtime.permissions.modes));assert.ok(Object.hasOwn(runtime.permissions,'current'));assert.ok(Object.hasOwn(runtime.permissions,'default'));}
  const invalid=await call('runtime:permission',{runtimeId:'codex',mode:'invalid'});assert.equal(invalid.ok,false);
  const changed=await call('runtime:permission',{runtimeId:'codex',mode:'readonly'});assert.equal(changed.ok,true);assert.equal(changed.value.find(r=>r.id==='codex').permissions.current,'readonly');
  const created=await call('session:create',{projectId:'qa-a',runtimeId:'codex',selection:{modelKey:'native'},title:'授权接口检查'});assert.equal(created.ok,true);assert.equal(created.value.permissionMode,'readonly');
  const sessionChanged=await call('session:permission',{sessionId:created.value.id,mode:'ask'});assert.equal(sessionChanged.ok,true);assert.equal(sessionChanged.value.permissionMode,'ask');
  const reset=await call('runtime:permission',{runtimeId:'codex',mode:null});assert.equal(reset.ok,true);
  await writeFile(join(out,'result.json'),JSON.stringify({passed:true,screenshots:gemini?17:16,models:modelCount,geminiNativeBinding:!!gemini,codexNativeModels:{count:expectedNative.length,hidden:expectedNative.filter(m=>m.hidden).length,pickerUnfiltered:true,effortsMatched:true},regressions,permissionsIPC:true,rendererErrors:errors},null,2));
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(`Desktop QA: ${gemini?17:16} screens, ${modelCount} source models, ${expectedNative.length} native Codex models passed.`);
}
