import {createHmac} from 'node:crypto';
export function serviceProof(key,{nonce,id,instanceId,pid,baseURL}){return createHmac('sha256',key).update(JSON.stringify(['bridgepp-identify-v1',nonce,id,instanceId,pid,baseURL])).digest('hex');}
