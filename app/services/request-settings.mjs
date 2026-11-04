// Current bridge transports have no verified forwarding path for these sampling controls.
// A null value means the caller left the setting unspecified.
export function assertSamplingSupported(body){
  const supplied=['temperature','top_p','frequency_penalty','presence_penalty'].filter(key=>body[key]!==undefined&&body[key]!==null);
  if(supplied.length)throw new Error(`当前 bridge 尚未支持这些请求级采样参数：${supplied.join(', ')}。请使用来源默认值。`);
}
