import {realpath, stat, readdir, readFile, writeFile, rename, rm} from 'node:fs/promises';
import {join,relative,resolve,isAbsolute,basename,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const digest=text=>createHash('sha256').update(text).digest('hex');
const skipped=new Set(['.git','node_modules','.runtime','.cache','dist','release','__pycache__','.venv']);
const saves=new Map();
export async function projectDirectory(path){if(typeof path!=='string'||!isAbsolute(path))throw new Error('Absolute project directory required');const actual=await realpath(path);if(!(await stat(actual)).isDirectory())throw new Error('Project path must be a directory');return actual;}
export async function contained(root,path,{create=false,missingParents=false}={}){
  if(typeof path!=='string'||!path||isAbsolute(path)||path.includes('\0')||path.includes(':'))throw new Error('A project-relative file path is required');
  const actualRoot=await realpath(root),target=resolve(actualRoot,path),rel=relative(actualRoot,target);
  if(rel==='..'||rel.startsWith('..\\')||rel.startsWith('../')||isAbsolute(rel))throw new Error('Path escapes the project');
  const gitInternal=value=>value.split(/[\\/]/).some(part=>part.replace(/[ .]+$/,'').toLowerCase()==='.git');
  if(gitInternal(rel))throw new Error('Git internals are managed by Git');
  let actual;try{actual=await realpath(target);}catch(e){
    if(!create||e.code!=='ENOENT')throw e;let parent=dirname(target),suffix=[basename(target)];
    for(;;)try{actual=join(await realpath(parent),...suffix);break;}catch(error){if(!missingParents||error.code!=='ENOENT'||parent===actualRoot)throw error;suffix.unshift(basename(parent));parent=dirname(parent);}
  }
  const canonical=relative(actualRoot,actual);if(canonical==='..'||canonical.startsWith('..\\')||canonical.startsWith('../')||isAbsolute(canonical))throw new Error('Symlink escapes the project');if(gitInternal(canonical))throw new Error('Git internals are managed by Git');return actual;
}
export async function tree(root,path=''){
  const folder=path?await contained(root,path):await realpath(root);
  const entries=await readdir(folder,{withFileTypes:true});return entries.filter(e=>!skipped.has(e.name.toLowerCase())&&!e.isSymbolicLink()).sort((a,b)=>Number(b.isDirectory())-Number(a.isDirectory())||a.name.localeCompare(b.name)).map(e=>({name:e.name,path:path?`${path}/${e.name}`:e.name,directory:e.isDirectory()}));
}
export async function readProjectFile(root,path){const file=await contained(root,path);const info=await stat(file);if(!info.isFile()||info.size>2*1024*1024)throw new Error('Editor supports text files up to 2 MiB');const data=await readFile(file);if(data.includes(0))throw new Error('Binary file cannot be edited as text');return {path,text:data.toString('utf8'),revision:digest(data)};}
export async function writeProjectFile(root,{path,text,revision}){
  const target=await contained(root,path,{create:true}),key=process.platform==='win32'?target.toLowerCase():target;
  const task=(saves.get(key)??Promise.resolve()).catch(()=>{}).then(()=>saveProjectFile(root,{path,text,revision}));saves.set(key,task);
  try{return await task;}finally{if(saves.get(key)===task)saves.delete(key);}
}
async function saveProjectFile(root,{path,text,revision}){
  if(typeof text!=='string'||Buffer.byteLength(text)>2*1024*1024)throw new Error('File content is too large');
  const target=await contained(root,path,{create:true});
  let previous;try{previous=await readProjectFile(root,path);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(previous&&previous.revision!==revision)throw new Error('File changed outside the editor. Reload before saving.');
  if(!previous&&revision)throw new Error('File was removed outside the editor');
  // Recheck canonical parent directly before write; atomic replacement avoids partial saves.
  await contained(root,path,{create:true});const temp=join(dirname(target),`.awb-${randomUUID()}.tmp`);
  try{await writeFile(temp,text,{flag:'wx',mode:previous?(await stat(target)).mode:0o600});const latest=await readFile(target).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if((latest?digest(latest):null)!==(previous?.revision??null))throw new Error('File changed outside the editor. Reload before saving.');await rename(temp,target);}finally{await rm(temp,{force:true}).catch(()=>{});}return {path,text,revision:digest(text)};
}
export async function git(root,args,{timeout=15000}={}){const cwd=await projectDirectory(root);const {stdout}=await exec('git',['--literal-pathspecs','-c','core.quotepath=false',...args],{cwd,windowsHide:true,encoding:'utf8',timeout,maxBuffer:8*1024*1024});return stdout;}
export async function gitStatus(root){try{const [branch,files]=await Promise.all([git(root,['branch','--show-current']),git(root,['status','--porcelain=v1','--untracked-files=all','-z'])]);const parts=files.split('\0'),rows=[];for(let i=0;i<parts.length;i++){const line=parts[i];if(!line)continue;const status=line.slice(0,2),path=line.slice(3);const row={status,path};if(status.includes('R')||status.includes('C'))row.oldPath=parts[++i];rows.push(row);}return {repository:true,branch:branch.trim()||'detached HEAD',files:rows};}catch(e){if(/not a git repository/i.test(e.stderr??''))return {repository:false,branch:null,files:[]};throw e;}}
export async function gitDiff(root,path){
  if(path)await contained(root,path,{create:true,missingParents:true});
  const status=await gitStatus(root),row=status.files.find(f=>f.path===path);
  if(row?.status==='??'){const file=await readProjectFile(root,path);return `diff --git a/${path} b/${path}\nnew file mode 100644\n--- /dev/null\n+++ b/${path}\n@@ -0,0 +1,${file.text.split('\n').length} @@\n`+file.text.split('\n').map(line=>'+'+line).join('\n');}
  let head=true;try{await git(root,['rev-parse','--verify','HEAD']);}catch(error){if(error.code===128||error.code===1)head=false;else throw error;}
  const paths=path?[...(row?.oldPath?[row.oldPath]:[]),path]:[];
  if(head)return git(root,['diff','--no-ext-diff','--no-color','HEAD','--',...paths]);
  const [staged,unstaged]=await Promise.all([git(root,['diff','--cached','--no-ext-diff','--no-color','--',...paths]),git(root,['diff','--no-ext-diff','--no-color','--',...paths])]);return staged+unstaged;
}
export async function gitCommit(root,message){if(typeof message!=='string'||!message.trim()||message.length>2000)throw new Error('Commit message required');return git(root,['commit','-m',message]);}
export async function gitStage(root,paths){if(!Array.isArray(paths)||!paths.length||paths.length>300)throw new Error('Select files to stage');for(const path of paths)await contained(root,path,{create:true,missingParents:true});return git(root,['add','--',...paths]);}
