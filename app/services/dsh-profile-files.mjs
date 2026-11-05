import {readFile,writeFile,rename,rm,stat} from 'node:fs/promises';
import {withFileLock} from './file-lock.mjs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {createHash,randomBytes} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parseDocument,isMap,isSeq} from 'yaml';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const alive=pid=>{try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}};
const names={'llm-pi-ai':'@deepseek-ai/dsh-llm-pi-ai','agent-default-model':'@deepseek-ai/dsh-agent-default-model'};
function yamlError(error){const pos=Array.isArray(error.linePos)?error.linePos[0]:error.linePos;throw new Error(`DSH YAML 配置无法解析（${error.code??'YAML_ERROR'}${pos?`，行 ${pos.line}，列 ${pos.col}`:''}）`);}
function parse(text){const doc=parseDocument(text,{lineWidth:0});if(doc.errors.length)yamlError(doc.errors[0]);return doc;}
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';return JSON.stringify(value)??'null';}
function revision(config){return createHash('sha256').update(canonical(config??{})).digest('hex');}
function targetIndex(doc,id){const items=doc.contents.items;let missing=-1;for(let i=items.length-1;i>=0;i--){const row=items[i];if(isMap(row)&&row.get('id')===id&&!row.has('insert')){if(row.has('config'))return i;if(missing<0)missing=i;}}return missing;}
function configAt(doc,ns){const index=targetIndex(doc,ns);if(index<0)return {};return doc.toJS()[index]?.config??{};}
function baseProjection(node){return {type:isMap(node)?'map':isSeq(node)?'seq':'scalar',tag:node?.tag??null,anchor:node?.anchor??null,comment:node?.comment??null,commentBefore:node?.commentBefore??null};}
function projection(node,path=[],masks=new Set()){
 const key=JSON.stringify(path);if(masks.has(key))return '<target>';
 if(node==null||typeof node!=='object')return {type:'scalar',tag:null,anchor:null,comment:null,commentBefore:null,value:node};
 const base=baseProjection(node);
 if(isMap(node))return {...base,items:node.items.filter(pair=>!masks.has(JSON.stringify([...path,pair.key?.value??pair.key]))).map(pair=>({comment:pair.comment??null,key:projection(pair.key,path,masks),value:projection(pair.value,[...path,pair.key?.value??pair.key],masks)}))};
 if(isSeq(node))return {...base,items:node.items.flatMap((item,index)=>masks.has(JSON.stringify([...path,index]))?[]:[projection(item,[...path,index],masks)])};
 if(node.type==='PLAIN'||node.type==='QUOTE_DOUBLE'||node.type==='QUOTE_SINGLE'||node.type==='BLOCK_FOLDED'||node.type==='BLOCK_LITERAL'||Object.hasOwn(node,'value'))return {...base,value:node.value};
 return {...base,value:String(node)};
}
function documentProjection(doc,masks){return {comment:doc.comment??null,commentBefore:doc.commentBefore??null,contents:projection(doc.contents,[],masks)};}
function maskFor(doc,base,path){
 const masks=new Set();if(!doc.hasIn(base)){masks.add(JSON.stringify(base));return masks;}
 let current=[...base];masks.add(JSON.stringify([...current,...path]));
 for(const key of path){if(!doc.hasIn([...current,key])){masks.add(JSON.stringify([...current,key]));break;}current.push(key);}
 return masks;
}
function mergeMasks(...sets){return new Set(sets.flatMap(set=>[...set]));}
async function replace(file,text){
 const tmp=file+'.'+randomBytes(6).toString('hex')+'.tmp';
 try{await writeFile(tmp,text,{flag:'wx',mode:0o600});for(let n=0;;n++)try{await rename(tmp,file);return;}catch(error){if(n>=7||!['EACCES','EBUSY','EPERM'].includes(error.code))throw error;await delay(Math.min(200,20*2**n));}}finally{await rm(tmp,{force:true}).catch(()=>{});}
}
export class DshProfileFiles {
 constructor({home=process.env.DSH_HOME||join(homedir(),'.dsh'),profile='desktop',namespaces=names,pidAlive=alive,lockTimeoutMs=30000}={}){if(!['desktop','web'].includes(profile))throw new Error('不支持的 DSH profile');Object.assign(this,{home,profile,namespaces,pidAlive,lockTimeoutMs});this.patch=join(home,'profiles',profile,'cordis.patch.yml');this.credentials=join(home,'.credentials.yaml');}
 async locked(file,action){return withFileLock(file+'.lock',action,{pidAlive:this.pidAlive,lockTimeoutMs:this.lockTimeoutMs,timeoutMessage:'等待 DSH 配置锁超时，未修改文件'});}
 async readPatch(){const info=await stat(join(this.home,'profiles',this.profile)).catch(error=>{if(error.code==='ENOENT')return null;throw error;});if(!info?.isDirectory())throw new Error(this.profile==='desktop'?'未找到 DSH 桌面配置，请先启动一次 DSH 再接入。':'未找到 DSH 私有 Host 配置。');let text;try{text=await readFile(this.patch,'utf8');}catch(error){if(error.code==='ENOENT')return {doc:parse('[]\n'),text:null};throw error;}const doc=parse(text);if(!isSeq(doc.contents))throw new Error('DSH 补丁配置必须是 YAML 数组，未修改文件');return {doc,text};}
 async describe(){const {doc}=await this.readPatch();return {writable:true,namespaces:Object.keys(this.namespaces).map(ns=>{const config=configAt(doc,ns);return {ns,revision:revision(config),section:{},user:config};})};}
 async mutate({ns,expectedRevision,ops}){
  if(!Object.hasOwn(this.namespaces,ns)||!Array.isArray(ops)||ops.some(op=>!['set','unset'].includes(op.op)||!Array.isArray(op.path)||op.path.some(key=>typeof key!=='string'||!key)))throw new Error('不支持的 DSH 设置变更');
  await this.readPatch();
  return this.locked(this.patch,async()=>{
   const {doc}=await this.readPatch(),original=doc.clone();let index=targetIndex(doc,ns),appended=false;if(index>=0&&revision(configAt(doc,ns))!==expectedRevision)throw new Error('DSH 设置已并发变化');if(index<0){if(revision({})!==expectedRevision)throw new Error('DSH 设置已并发变化');doc.add(doc.createNode({id:ns,name:this.namespaces[ns],config:{}}));index=doc.contents.items.length-1;appended=true;}else if(!doc.hasIn([index,'config']))doc.setIn([index,'config'],doc.createNode({}));
   const masks=appended?new Set([JSON.stringify([index])]):mergeMasks(...ops.map(op=>maskFor(original,[index,'config'],op.path)));
   for(const op of ops){const path=[index,'config',...op.path];if(op.op==='set')doc.setIn(path,doc.createNode(structuredClone(op.value)));else doc.deleteIn(path);}
   const next=doc.toString({lineWidth:0}),check=parse(next);if(!isSeq(check.contents))throw new Error('DSH 补丁配置校验失败，未写入');if(!isDeepStrictEqual(documentProjection(original,masks),documentProjection(check,masks))||!isDeepStrictEqual(doc.toJS(),check.toJS()))throw new Error('DSH 配置校验失败，除目标路径外的内容发生变化，未写入');
   await replace(this.patch,next);return {};
  });
 }
 async setCredential({ref,value}){
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(ref)||typeof value!=='string'||!value)throw new Error('无效的 DSH 凭据引用或值');
  await this.readPatch();return this.locked(this.credentials,async()=>{
   const text=await readFile(this.credentials,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});let doc,masks=new Set();
   if(text==null||!text.trim()){doc=parse('version: 1\nrefs:\n');doc.set('refs',doc.createNode({}));}else{doc=parse(text);if(!isMap(doc.contents)||doc.get('version')!==1)throw new Error('DSH 凭据文件版本不受支持，未修改文件');masks=maskFor(doc,['refs'],[ref]);}
   const original=doc.clone();doc.setIn(['refs',ref],value);const next=doc.toString({lineWidth:0});
   if(text!=null&&text.trim()){const check=parse(next);if(!isDeepStrictEqual(documentProjection(original,masks),documentProjection(check,masks))||!isDeepStrictEqual(doc.toJS(),check.toJS()))throw new Error('DSH 凭据配置校验失败，除目标引用外的内容发生变化，未写入');}
   await replace(this.credentials,next);return {};
  });
 }
 async unsetCredential({ref}){
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(ref))throw new Error('无效的 DSH 凭据引用');
  await this.readPatch();return this.locked(this.credentials,async()=>{
   const text=await readFile(this.credentials,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});if(text==null||!text.trim())return {};const doc=parse(text);if(!isMap(doc.contents)||doc.get('version')!==1)throw new Error('DSH 凭据文件版本不受支持，未修改文件');if(!doc.hasIn(['refs',ref]))return {};
   const masks=maskFor(doc,['refs'],[ref]),original=doc.clone();doc.deleteIn(['refs',ref]);const next=doc.toString({lineWidth:0}),check=parse(next);if(!isDeepStrictEqual(documentProjection(original,masks),documentProjection(check,masks))||!isDeepStrictEqual(doc.toJS(),check.toJS()))throw new Error('DSH 凭据配置校验失败，除目标引用外的内容发生变化，未写入');await replace(this.credentials,next);return {};
  });
 }
 async modelCatalog(){const {doc}=await this.readPatch(),providers=configAt(doc,'llm-pi-ai').providers??{};return {groups:Object.entries(providers).map(([id,p])=>({id,models:(p.models??[]).map(model=>({id:model.id}))}))};}
 async rpc(method,args={}){if(method==='settings/describe')return this.describe();if(method==='credentials/set')return this.setCredential(args);if(method==='credentials/unset')return this.unsetCredential(args);if(method==='settings/mutate')return this.mutate(args);if(method==='session/modelCatalog')return this.modelCatalog();throw new Error('不支持的 DSH 配置操作');}
}
