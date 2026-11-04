import {readFileSync} from 'node:fs';
const message=JSON.parse(readFileSync(0,'utf8')),text=message.message.content,args=process.argv.slice(2),emit=m=>process.stdout.write(JSON.stringify(m)+'\n');
const lines=text.split('\n'),files=[];for(let n=0;n<lines.length-1;n++)if(lines[n].startsWith('{')&&lines[n+1].startsWith('Windows绝对路径：'))try{files.push({...JSON.parse(lines[n]),Windows绝对路径:lines[n+1].slice('Windows绝对路径：'.length)});}catch{}
emit({event:'init',conversation_id:'native-agy-fixture'});
for(const [index,file]of files.entries())emit({event:'step_update',step_update:{step_type:'tool',step_index:index+1,state:'DONE',tool_name:'read_file',tool_info:{parameters:{Path:file.Windows绝对路径}}}});
emit({event:'result',result:{status:'SUCCESS',response:JSON.stringify({files,args})}});
