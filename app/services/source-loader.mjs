import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {locateSourcePackage,sourceDefinition,componentRequired,packagedSources,SOURCE_ROOT} from './source-packages.mjs';
export async function registerSourcePackage(id,{packageDir=process.env.AWB_SOURCE_PACKAGE_DIR,root=SOURCE_ROOT,isPackaged=packagedSources(root),userData}={}){
 const row=sourceDefinition(id);let info;try{info=await locateSourcePackage(id,{packageDir,root,isPackaged,userData});}catch(error){if(error.code==='ENOENT')throw componentRequired(id);throw error;}if(!info)throw componentRequired(id);
 // Only the selected SDK is redirected. Its own imports retain the component
 // file URL, so Node resolves dependencies beside the downloaded package.
 const hook=registerHooks({resolve(specifier,context,nextResolve){
  if(specifier===row.package)return {url:pathToFileURL(info.entry).href,shortCircuit:true};
  if(specifier.startsWith(row.package+'/'))return nextResolve(specifier,{...context,parentURL:pathToFileURL(join(info.directory,'package.json')).href});
  return nextResolve(specifier,context);
 }});return {...info,hook};
}
