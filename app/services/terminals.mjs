import {EventEmitter} from 'node:events';
import {launch,stopProcess} from '../core/process.mjs';
export class Terminals extends EventEmitter {
  constructor(){super();this.entries=new Map();this.closed=false;}
  state(projectId){const entry=this.entries.get(projectId);return {text:entry?.text??'',running:!!entry?.running};}
  run(project,command){
    if(this.closed)throw new Error('Terminal service closed');if(typeof command!=='string'||!command.trim()||command.length>20000)throw new Error('请输入终端命令');
    if(this.entries.get(project.id)?.running)throw new Error('终端命令仍在运行');
    const previous=this.entries.get(project.id);const script="[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); $OutputEncoding = [Console]::OutputEncoding;\n"+command;
    const child=launch('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{cwd:project.path});
    const entry={child,running:true,text:(previous?.text??'')+'❯ '+command+'\n'};this.entries.set(project.id,entry);this.emit('event',{type:'terminal-start',projectId:project.id});
    const output=(text,stream)=>{entry.text=(entry.text+text).slice(-2*1024*1024);this.emit('event',{type:'terminal',projectId:project.id,text,stream});};
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',text=>output(text,'stdout'));child.stderr.on('data',text=>output(text,'stderr'));
    const finish=code=>{if(!entry.running)return;entry.running=false;entry.text+='\n[退出代码 '+code+']\n';this.emit('event',{type:'terminal-exit',projectId:project.id,code});};
    child.on('error',error=>{output(error.message,'stderr');finish(1);});child.on('close',code=>finish(code));return true;
  }
  stop(projectId){return stopProcess(this.entries.get(projectId)?.child);}
  async close(){this.closed=true;await Promise.all([...this.entries.values()].filter(e=>e.running).map(e=>stopProcess(e.child)));}
}
