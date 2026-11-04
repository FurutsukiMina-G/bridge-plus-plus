import {mkdir,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {SOURCE_DEFINITIONS} from '../../app/services/source-packages.mjs';
export async function put(file,text){await mkdir(dirname(file),{recursive:true});await writeFile(file,text);}
export async function sourcePackage(prefix,id,{version,broken=false,worker=true,code}={}){
 const row=SOURCE_DEFINITIONS.find(row=>row.id===id),directory=join(prefix,'node_modules',row.package),entry=join(directory,row.entry);
 await put(join(directory,'package.json'),JSON.stringify({name:row.package,version:version??row.version,type:'module',main:row.entry,exports:{'.':'./'+row.entry,'./protocol':'./protocol.js'},...id==='qoder'?{qoderCliVersion:'1.1.64'}:{}}));
 await put(join(directory,'protocol.js'),"export const protocol='fixture-protocol';");
 await put(join(prefix,'node_modules/fixture-source-dependency/package.json'),JSON.stringify({name:'fixture-source-dependency',type:'module',exports:'./index.js'}));await put(join(prefix,'node_modules/fixture-source-dependency/index.js'),"export const marker='component-local-dependency';");
 await put(entry,code??(broken?"throw new Error('synthetic import failure');":"import {marker} from 'fixture-source-dependency'; export {marker}; export function startup(){} export function query(){}"));
 if(id==='qoder'&&worker){const base=join(directory,'dist/_worker'),packages=[{name:'fixture-worker-dependency',version:'1.0.0',path:'node_modules/fixture-worker-dependency/package.json'}],ripgrep=[`vendor/ripgrep/${process.arch}-${process.platform}/${process.platform==='win32'?'rg.exe':'rg'}`];
  await put(join(base,'runtime-info.json'),JSON.stringify({version:'1.1.64',profile:'platform',target:`${process.platform}-${process.arch}`,entrypoint:'qoder-worker-runtime.obf.mjs',build:{site:'cn',productName:'qoderclicn'},assets:{packages,ripgrep,nodeModulesRoot:true}}));await put(join(base,'qoder-worker-runtime.obf.mjs'),'// synthetic Worker entry\n');await put(join(base,packages[0].path),JSON.stringify({name:packages[0].name,version:packages[0].version}));await put(join(base,ripgrep[0]),'synthetic binary');for(const folder of ['builtin','proto'])await put(join(base,folder,'fixture'),'synthetic asset');
 }
 return {directory,entry};
}
