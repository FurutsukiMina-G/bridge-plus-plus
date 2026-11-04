/** Bounded reuse of a verified directory, with one network request per concurrent refresh. */
export class CatalogVerifier {
  constructor(load,{ttlMs=600000,now=Date.now}={}){Object.assign(this,{load,ttlMs,now});this.value=null;this.expires=0;this.pending=null;}
  invalidate(){this.expires=0;this.value=null;}
  async verify(id,name){
    if(!this.value||this.now()>=this.expires){
      if(!this.pending)this.pending=Promise.resolve().then(()=>this.load()).then(value=>{this.value=value;this.expires=this.now()+this.ttlMs;return value;}).finally(()=>{this.pending=null;});
      await this.pending;
    }
    if(!this.value.some(m=>m.id===id&&m.name===name))throw new Error('WorkBuddy model identity changed; refresh the source and reconfirm the model');
  }
}
