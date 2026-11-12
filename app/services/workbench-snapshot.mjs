import {runtimePermissionView} from './runtime-permissions.mjs';
import {rulesSnapshot} from './agent-rules.mjs';

export async function workbenchSnapshot({store,sourceComponents,modelServices,environments,runtimes,attachmentCapabilityService,boot,appVersion,appUpdates}){
  const snapshot=store.snapshot();snapshot.sessions=await attachmentCapabilityService.snapshotSessions(snapshot.sessions);
  snapshot.rules=await rulesSnapshot(store);
  return {...snapshot,sourceComponents:sourceComponents.snapshot(),modelServices:await modelServices.snapshot(),environments:environments.snapshot(),onboarding:environments.onboarding(),runtimes:environments.runtimeViews(runtimes).map(row=>runtimePermissionView(row,store.state.preferences.runtimes[row.id])),startup:boot.state(),app:{version:appVersion,dataDir:store.root},updates:appUpdates?.view()??null};
}
