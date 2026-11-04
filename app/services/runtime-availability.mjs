export function assertRuntimeReady(runtime,extraReason=null){
 if(!runtime)throw new Error('未知开发环境，请到设置 → 开发环境处理');
 const status=runtime.status??(runtime.installed?'ready':'missing');
 if(status!=='ready'||extraReason)throw new Error(`${runtime.name??runtime.id} 当前不可用：${extraReason??runtime.reason??({missing:'尚未安装','needs-setup':'尚未配置完成',error:'检测失败'}[status]??'尚未就绪')}。请到设置 → 开发环境安装、配置或重新检测。`);
 return runtime;
}
