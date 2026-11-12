import {crc32,deflateRawSync} from 'node:zlib';

const LOCAL=0x04034b50,CENTRAL=0x02014b50,END=0x06054b50,UTF8=0x0800;

function dosTime(date){
  const year=Math.min(2107,Math.max(1980,date.getFullYear()));
  return {
    time:(date.getHours()<<11)|(date.getMinutes()<<5)|Math.floor(date.getSeconds()/2),
    date:((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate()
  };
}

/** Minimal ZIP writer: deflate, CRC32, UTF-8 names and no extra fields. */
export function writeZip(files,{now=new Date()}={}){
  if(!Array.isArray(files)||!files.length)throw new Error('ZIP needs at least one file');
  const stamp=dosTime(now),locals=[],centrals=[];let offset=0;
  for(const file of files){
    if(!file||typeof file.name!=='string'||!file.name||file.name.includes('\0')||Buffer.byteLength(file.name)>0xffff)throw new Error('Invalid ZIP entry name');
    const name=Buffer.from(file.name,'utf8'),data=Buffer.isBuffer(file.data)?file.data:Buffer.from(String(file.data??''),'utf8'),packed=deflateRawSync(data),crc=crc32(data);
    if(data.length>0xffffffff||packed.length>0xffffffff||offset>0xffffffff)throw new Error('ZIP entry exceeds 4 GiB');
    const local=Buffer.alloc(30);
    local.writeUInt32LE(LOCAL,0);local.writeUInt16LE(20,4);local.writeUInt16LE(UTF8,6);local.writeUInt16LE(8,8);
    local.writeUInt16LE(stamp.time,10);local.writeUInt16LE(stamp.date,12);local.writeUInt32LE(crc,14);
    local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);local.writeUInt16LE(0,28);
    locals.push(local,name,packed);
    const central=Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(UTF8,8);central.writeUInt16LE(8,10);
    central.writeUInt16LE(stamp.time,12);central.writeUInt16LE(stamp.date,14);central.writeUInt32LE(crc,16);
    central.writeUInt32LE(packed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);
    central.writeUInt16LE(0,30);central.writeUInt16LE(0,32);central.writeUInt16LE(0,34);central.writeUInt16LE(0,36);central.writeUInt32LE(0,38);central.writeUInt32LE(offset,42);
    centrals.push(central,name);
    offset+=local.length+name.length+packed.length;
  }
  if(files.length>0xffff||offset>0xffffffff)throw new Error('ZIP exceeds 4 GiB or 65535 entries');
  const directory=Buffer.concat(centrals),end=Buffer.alloc(22);
  end.writeUInt32LE(END,0);end.writeUInt16LE(0,4);end.writeUInt16LE(0,6);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
  end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);end.writeUInt16LE(0,20);
  return Buffer.concat([...locals,directory,end]);
}
