export class CancelledError extends Error {
  constructor(message='操作已停止'){super(message);this.name='AbortError';}
}

/** Native callbacks must settle in arrival order, including events after stdout closes. */
export class RuntimeLifecycle {
  constructor(options){Object.assign(this,options);this.closed=false;this.events=Promise.resolve();this.starting=null;this.ready=false;}
  checkOpen(){if(this.closed)throw new CancelledError();}
  enqueue(task){const pending=this.events.then(task);this.events=pending.catch(async error=>{if(!this.closed){this.running=false;await this.emit({type:'error',text:error.message}).catch(()=>{});await this.emit({type:'turn-end',status:'failed'}).catch(()=>{});}});return this.events;}
  async ensureStarted(){
    this.checkOpen();if(this.ready)return;
    this.starting??=Promise.resolve().then(()=>this.start()).then(()=>{this.checkOpen();this.ready=true;});
    try{await this.starting;}catch(error){this.starting=null;this.ready=false;await this.rpc?.close().catch(()=>{});this.rpc=null;throw error;}
    this.checkOpen();
  }
}
