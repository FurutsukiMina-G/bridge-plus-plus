export function qoderRequestTimeout(value=process.env.QODER_TIMEOUT_MS):number {
  const ms=Number(value??1200000);
  if(!Number.isSafeInteger(ms)||ms<1000||ms>1800000)throw new Error('Invalid QODER_TIMEOUT_MS (1000–1800000 ms)');
  return ms;
}

export function qoderUpstreamIdleTimeout(configured?:number):number {
  const ms=configured??Number(process.env.QODER_IDLE_TIMEOUT_MS);
  return Number.isSafeInteger(ms)&&ms>=1000&&ms<=600000?ms:180000;
}

export function upstreamSilence(signal:AbortSignal,ms:number,error:Error){
  const idle=new AbortController();
  const arm=()=>setTimeout(()=>idle.abort(error),ms);
  let timer=arm();
  return {signal:AbortSignal.any([signal,idle.signal]),stalled:()=>idle.signal.aborted,
    touch:()=>{clearTimeout(timer);timer=arm();},close:()=>clearTimeout(timer)};
}
