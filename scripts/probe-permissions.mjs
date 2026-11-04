import {discoverRuntimes} from '../app/services/runtime-paths.mjs';
import {withRuntimePermissions} from '../app/services/runtime-permissions.mjs';
// CLI/schema/ACP handshakes only: no inference, provider selection or user config writes.
const runtimes=await withRuntimePermissions(await discoverRuntimes());
console.log(JSON.stringify(runtimes.map(r=>({id:r.id,permissions:r.permissions})),null,2));
if(runtimes.some(r=>r.installed&&r.permissions.observed.unavailable))process.exitCode=1;
