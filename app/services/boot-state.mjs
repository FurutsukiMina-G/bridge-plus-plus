export class BootState {
  constructor(){this.phases=new Map(['environments','services'].map(id=>[id,{state:'checking',resolve:null}]));this.waiters=new Map([...this.phases.keys()].map(id=>[id,new Promise(resolve=>{this.phases.get(id).resolve=resolve;})]));}
  state(){return Object.fromEntries([...this.phases].map(([id,value])=>[id,value.state]));}
  done(phase){const value=this.phases.get(phase);if(!value||value.state==='ready')return;value.state='ready';value.resolve();}
  ready(...phases){return Promise.all(phases.map(phase=>this.waiters.get(phase)).filter(Boolean)).then(()=>undefined);}
}
