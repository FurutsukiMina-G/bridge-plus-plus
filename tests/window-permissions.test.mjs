import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowMainWindowFullscreen} from '../app/services/window-permissions.mjs';

test('only the main index window may request fullscreen',()=>{const entryUrl='file:///project/app/ui/index.html',base={permission:'fullscreen',requestingUrl:entryUrl,isMainWindow:true,entryUrl};assert.equal(allowMainWindowFullscreen(base),true);for(const patch of [{permission:'camera'},{requestingUrl:'https://untrusted.invalid'},{isMainWindow:false},{entryUrl:'file:///other/index.html'}])assert.equal(allowMainWindowFullscreen({...base,...patch}),false);});
