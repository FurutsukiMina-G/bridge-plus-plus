import {spawn} from 'node:child_process';
import electron from 'electron';
import {resolve} from 'node:path';
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(electron,[resolve('.'),...process.argv.slice(2)],{stdio:'inherit',windowsHide:false,env});
child.on('exit',code=>{process.exitCode=code??1;});child.on('error',e=>{console.error(e.message);process.exitCode=1;});
