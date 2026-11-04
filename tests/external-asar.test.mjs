import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {readExternalAsar} from '../app/core/external-asar.mjs';
import {inspectRuntimeMedia} from '../app/services/media-capabilities.mjs';

test('DSH capability inspection uses original-fs when Electron patched fs would reject the external asar',async()=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/external-asar-')),executable=join(root,'DSH.exe');await writeFile(executable,'synthetic executable, never launched');
  const archive=join(root,'resources/app.asar'),calls=[];
  const declaration="SessionPromptRequest readonly type: 'image'; readonly mediaType: ImageMediaType; readonly data: string;";
  const originalFs={readFile(path,encoding,callback){calls.push({path,encoding});callback(null,declaration);}};
  const media=await inspectRuntimeMedia({id:'dsh',executable},{readArchive:path=>readExternalAsar(path,{
    electronVersion:'synthetic-electron',loadOriginalFs:async()=>({default:originalFs}),
    nodeReadFile:async path=>{throw Object.assign(new Error('Electron asar patch rejects '+path),{code:'ENOENT'});}
  })});
  assert.equal(media.image,true);assert.equal(media.audio,false);assert.equal(media.video,false);assert.deepEqual(calls,[{path:archive,encoding:'utf8'}]);
});

test('plain Node reads the archive without attempting to import Electron original-fs',async()=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/plain-asar-')),path=join(root,'app.asar');await writeFile(path,'synthetic archive bytes 中文');
  let imports=0;const text=await readExternalAsar(path,{electronVersion:undefined,loadOriginalFs:async()=>{imports++;throw new Error('must not import original-fs in Node');}});
  assert.equal(text,'synthetic archive bytes 中文');assert.equal(imports,0);
});

test('missing original-fs falls back to node fs; original-fs read errors are preserved without retrying patched fs',async()=>{
  let fallbackReads=0;
  const text=await readExternalAsar('external.asar',{electronVersion:'synthetic',loadOriginalFs:async()=>{throw Object.assign(new Error('module unavailable'),{code:'ERR_MODULE_NOT_FOUND'});},nodeReadFile:async(path,encoding)=>{fallbackReads++;assert.equal(path,'external.asar');assert.equal(encoding,'utf8');return 'fallback';}});
  assert.equal(text,'fallback');assert.equal(fallbackReads,1);
  const failure=Object.assign(new Error('archive access denied'),{code:'EACCES'});
  await assert.rejects(readExternalAsar('external.asar',{electronVersion:'synthetic',loadOriginalFs:async()=>({readFile(_path,_encoding,callback){callback(failure);}}),nodeReadFile:async()=>{throw new Error('must not retry patched fs');}}),error=>error===failure);
});
