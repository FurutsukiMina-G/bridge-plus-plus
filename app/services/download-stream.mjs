export function httpsUrl(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw new Error('更新地址必须是无凭据的 HTTPS 地址');return url;}

// The deadline measures silence, not total transfer duration. Race each read as
// well as aborting fetch: injected streams and some adapters ignore AbortSignal.
export async function withIdleResponse(fetchImpl,url,{signal,idleTimeoutMs=60000,...init}={},consume){
 if(!Number.isFinite(idleTimeoutMs)||idleTimeoutMs<=0)throw new Error('无效下载空闲时限');
 const controller=new AbortController(),combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal,idleError=new Error('下载空闲超时：长时间未收到数据，请检查网络或系统代理');let timer,iterator;
 const touch=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(idleError),idleTimeoutMs);};
 const wait=async promise=>{const pending=Promise.resolve(promise);if(combined.aborted){void pending.catch(()=>{});combined.throwIfAborted();}let abort;const cancelled=new Promise((_,reject)=>{abort=()=>reject(combined.reason);combined.addEventListener('abort',abort,{once:true});});try{return await Promise.race([pending,cancelled]);}finally{combined.removeEventListener('abort',abort);}};
 touch();
 try{
  let response;try{response=await wait(Promise.resolve().then(()=>fetchImpl(httpsUrl(url).href,{...init,credentials:'omit',signal:combined})));}catch(error){if(combined.aborted)throw error;throw new Error('网络请求失败，请检查网络或系统代理');}
  if(!response.ok)throw new Error('网络请求失败（HTTP '+response.status+'）');touch();iterator=response.body?.[Symbol.asyncIterator]();
  async function* chunks(){while(iterator){const part=await wait(iterator.next());if(part.done)break;if(part.value.byteLength){touch();yield part.value;}}}
  const value=await consume(response,chunks(),combined);combined.throwIfAborted();return value;
 }catch(error){if(signal?.aborted)throw new DOMException('已取消','AbortError');if(controller.signal.aborted)throw idleError;throw error;}
 finally{clearTimeout(timer);controller.abort();if(iterator?.return)void Promise.resolve(iterator.return()).catch(()=>{});}
}
