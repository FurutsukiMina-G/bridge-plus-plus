const count=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
/** Cache reads must share the denominator of their own request; unknown is not zero. */
export function cacheUsage(usage,extra){
  const prompt=count(usage?.prompt_tokens),reported=count(usage?.prompt_tokens_details?.cached_tokens),extension=count(extra?.cached_tokens);
  const cached=reported??extension;
  if(cached===null)return {cached_tokens:null,cache_status:'not_reported'};
  if(prompt===null||cached>prompt)return {cached_tokens:null,cache_status:'not_reported',cache_validation:'outside_prompt'};
  const status=extra?.cache_status==='estimated'?'estimated':reported!==null||extra?.cache_status==='reported'?'reported':'estimated';
  return {cached_tokens:cached,cache_status:status};
}
/** Presentation projection only. Keep original journal records intact for diagnostics. */
export function usageForDisplay(event,provider){
  const d=event?.data;
  if(event?.type!=='usage'||!d||typeof d!=='object'||!('prompt_tokens' in d))return event;
  const cached=count(d.cached_tokens??d.prompt_tokens_details?.cached_tokens),prompt=count(d.prompt_tokens);
  const prefixOnly=(provider??d.provider)==='qoder'&&d.cache_status==='estimated';
  if(!prefixOnly&&(cached===null||prompt!==null&&cached<=prompt))return event;
  return {...event,data:{...d,cached_tokens:null,cache_status:'not_reported',
    ...(d.prompt_tokens_details?{prompt_tokens_details:{...d.prompt_tokens_details,cached_tokens:null}}:{}),
    cache_validation:prompt!==null&&cached!==null&&cached>prompt?'outside_prompt':prefixOnly?'prefix_is_not_observed_cache':'outside_prompt',discarded_cache_tokens:cached}};
}
