import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {copyFile,mkdir,readdir} from 'node:fs/promises';
import {copyRuntimeFile,copyRuntimeDirectory} from './runtime-copy.mjs';
import {findNpmCli} from '../app/services/environment-npm.mjs';
await mkdir('assets/runtime',{recursive:true});
await copyRuntimeFile(process.execPath,'assets/runtime/node.exe');
await copyRuntimeFile('assets/licenses/Node-LICENSE.txt','assets/runtime/Node-LICENSE.txt');
const npmRuntime=await findNpmCli();if(!npmRuntime)throw new Error('构建环境需要 npm CLI，以便随捆绑 Node 提供受管 Kimi 更新');
await copyRuntimeDirectory(npmRuntime.directory,'assets/runtime/npm');
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','-p','bridges/qoderbridge/tsconfig.json'],{stdio:'inherit',windowsHide:true});
// KaTeX needs its stylesheet and fonts beside the page; woff2 is the format Chromium picks.
await mkdir('app/ui/vendor/katex/fonts',{recursive:true});
for(const file of ['katex.min.css'])await copyFile(`node_modules/katex/dist/${file}`,`app/ui/vendor/katex/${file}`);
await copyFile('node_modules/katex/LICENSE','app/ui/vendor/katex/LICENSE');
for(const font of (await readdir('node_modules/katex/dist/fonts')).filter(name=>name.endsWith('.woff2')))await copyFile(`node_modules/katex/dist/fonts/${font}`,`app/ui/vendor/katex/fonts/${font}`);
await build({entryPoints:['app/ui/app.js'],bundle:true,outfile:'app/ui/build.js',platform:'browser',format:'esm',target:'chrome140',minify:false,sourcemap:true});
console.log('Built Qoder bridge and desktop renderer.');
