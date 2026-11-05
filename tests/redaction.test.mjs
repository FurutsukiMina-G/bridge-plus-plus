import {test} from 'node:test';
import assert from 'node:assert/strict';
import {redactSecrets} from '../app/services/redact-secrets.mjs';
import {redactWorkerText} from '../app/services/worker-log.mjs';
import {failureText} from '../app/services/failure-details.mjs';
import {serviceError} from '../app/services/model-service-system.mjs';

test('shared redaction covers headers, cookies, structured values, URLs and exact known secrets',()=>{
 const secrets=['bearer-secret','basic-secret','authorization-token','cookie-secret','set-cookie-secret','x-auth-secret','x-api-secret','json-secret','token-secret','password-secret','api-key-secret','access-secret','refresh-secret','url-secret','key-secret','sk-fixture-123','known-exact-secret'];
 const text=`Authorization: Bearer bearer-secret\nAuthorization: Basic basic-secret\nAuthorization: Token authorization-token\nCookie: cookie-secret\nSet-Cookie: set-cookie-secret\nx-auth-token: x-auth-secret\nx-api-key: x-api-secret\n{"token":"json-secret","secret":"token-secret","password":"password-secret","api_key":"api-key-secret","access_token":"access-secret","refresh_token":"refresh-secret"}\nhttps://fixture.invalid/?token=url-secret&key=key-secret\nsk-fixture-123 known-exact-secret`;
 for(const redact of [redactSecrets,redactWorkerText,text=>failureText(text,1200,['known-exact-secret'])]){const result=redact===redactSecrets?redact(text,['known-exact-secret']):redact(text);for(const secret of redact===redactWorkerText?secrets.slice(0,-1):secrets)assert.equal(result.includes(secret),false,secret);assert.equal(result.includes('prompt_tokens'),false);}
 const service=serviceError(new Error('Authorization: Basic basic-secret --key api-key-secret'),'known-exact-secret').message;for(const secret of ['basic-secret','api-key-secret'])assert.equal(service.includes(secret),false);
});

test('redaction leaves ordinary token usage and non-secret text intact',()=>{const text='tokens: 1234; prompt_tokens: 99; prompt_token: 5; cached_token: 5; token 用量正常；ordinary text';assert.equal(redactSecrets(text),text);assert.equal(failureText(text),text);});

test('redaction removes JSON authorization values with optional whitespace',()=>{for(const text of ['{"authorization":"Basic dXNlcjpwYXNz"}','{ "Authorization" : "Basic dXNlcjpwYXNz" }']){const result=redactSecrets(text);assert.equal(result.includes('dXNlcjpwYXNz'),false);assert.match(result,/\[redacted\]/);}});
