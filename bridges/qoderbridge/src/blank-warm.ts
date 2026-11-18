import type {Config} from './client.js';

export function blankWarmSettings(config:Config,env:NodeJS.ProcessEnv={}){
  const number=(value:number|string|undefined,fallback:number,min:number,max:number,message:string)=>{
    const result=Number(value??fallback);
    if(!Number.isSafeInteger(result)||result<min||result>max)throw new Error(message);
    return result;
  };
  return {
    blankWarmLimit:number(config.blankWarmLimit??env.QODER_BLANK_WARM_LIMIT,1,0,4,'Invalid Qoder blank runtime limit'),
    nativeWarmLimit:number(config.nativeWarmLimit??env.QODER_NATIVE_WARM_LIMIT,1,0,2,'Invalid Qoder native tool settings'),
    blankWarmTtlMs:number(config.blankWarmTtlMs??env.QODER_BLANK_WARM_TTL_MS,600000,1,2147483647,'Invalid Qoder blank runtime TTL'),
    blankWarmDemandMs:number(config.blankWarmDemandMs??env.QODER_WARM_DEMAND_MS,600000,0,2147483647,'Invalid Qoder blank runtime demand window'),
  };
}

// All model and tool-mode pools within one bridge share the same spare capacity.
export class BlankWarmSlots {
  private entries=new Set<{closeForJson?:()=>boolean}>();
  constructor(readonly limit:number){}
  reserve(closeForJson?:()=>boolean): (()=>void)|undefined {
    if(this.entries.size>=this.limit&&!closeForJson){
      for(const entry of this.entries)if(entry.closeForJson?.())break;
    }
    if(this.entries.size>=this.limit)return;
    const entry={closeForJson};this.entries.add(entry);
    return ()=>{this.entries.delete(entry);};
  }
}
