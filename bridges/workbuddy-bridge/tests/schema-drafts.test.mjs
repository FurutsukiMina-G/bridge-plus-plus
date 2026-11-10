import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import {compileTools,decisionInput,modelTools,withoutTopSchema} from '../src/decision.mjs';

const uri2020='https://json-schema.org/draft/2020-12/schema';
const uri2019='https://json-schema.org/draft/2019-09/schema';
const uri7='http://json-schema.org/draft-07/schema#';
const tool=(parameters,name='agent')=>({type:'function',function:{name,parameters}});
const body=(parameters,name='agent')=>({model:'deepseek-v4.1-flash',messages:[{role:'user',content:'fixture'}],tools:[tool(parameters,name)]});

// The observed defect: Ajv's default instance is draft-07 and cannot resolve the
// 2020-12 meta-schema, so a Claude Code Agent tool failed before any inference.
const agent2020={$schema:uri2020,type:'object',propertyNames:{pattern:'^[a-z_]+$'},
  properties:{name:{type:'string'},count:{type:'integer',exclusiveMinimum:0}},required:['name']};

test('the default draft-07 instance cannot resolve a declared 2020-12 schema',()=>{
  assert.throws(()=>new Ajv({allErrors:true,strict:false,validateFormats:false}).compile(agent2020),/no schema with key or ref/i);
});

test('a 2020-12 tool schema compiles and still enforces propertyNames and numeric exclusiveMinimum',()=>{
  const validate=compileTools([tool(agent2020)]).get('agent');
  assert.equal(validate({name:'x',count:1}),true);
  assert.equal(validate({name:'x',count:0}),false);
  assert.equal(validate({name:'x',Bad:1}),false);
  assert.equal(validate({count:1}),false);
  const definitions=modelTools(body(agent2020).tools);
  const parameters=definitions[0].function.parameters;
  assert.equal(Object.hasOwn(parameters,'$schema'),false);
  assert.deepEqual(parameters.propertyNames,{pattern:'^[a-z_]+$'});
  assert.deepEqual(parameters.properties.count,{type:'integer',exclusiveMinimum:0});
  // The model-visible JSON input carries the same cleaned definition.
  assert.doesNotMatch(decisionInput(body(agent2020)),/\$schema/);
});

test('a 2019-09 tool schema uses the 2019 dialect',()=>{
  const validate=compileTools([tool({$schema:uri2019,type:'object',
    properties:{a:{type:'string'},b:{type:'string'}},dependentRequired:{a:['b']}})]).get('agent');
  assert.equal(validate({a:'x',b:'y'}),true);
  assert.equal(validate({}),true);
  assert.equal(validate({a:'x'}),false);
});

test('declared draft-07, undeclared and unrecognized schemas keep the default dialect',()=>{
  const shape={type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false};
  for(const schema of [{$schema:uri7,...shape},shape,{$schema:'https://example.test/unknown/schema',...shape}]){
    const validate=compileTools([tool(schema)]).get('agent');
    assert.equal(validate({path:'a.ts'}),true);
    assert.equal(validate({}),false);
    assert.equal(validate({path:'a.ts',extra:1}),false);
    const parameters=modelTools(body(schema).tools)[0].function.parameters;
    assert.equal(Object.hasOwn(parameters,'$schema'),false);
    assert.deepEqual(parameters.required,['path']);
  }
});

test('a schema that stays invalid after dialect selection is still rejected',()=>{
  const failure=fn=>{try{fn();return null;}catch(error){return error;}};
  const invalid=failure(()=>compileTools([tool({$schema:uri2020,type:'not-a-type'})]));
  assert.equal(invalid?.code,'invalid_tool_schema');assert.equal(invalid?.status,400);
  // A dialect marker alone never relaxes validation: an unconstrained schema still validates.
  assert.equal(compileTools([tool({type:'object'})]).get('agent')({anything:1}),true);
  assert.equal(withoutTopSchema({type:'object'}).$schema,undefined);
  assert.equal(withoutTopSchema('fixture'),'fixture');
  // Dropping an unknown marker keeps strictness: the rest of the schema still applies.
  const unknown=failure(()=>compileTools([tool({$schema:'https://example.test/x',type:'object',required:['path']})]));
  assert.equal(unknown,null);
  const duplicate=failure(()=>compileTools([tool(agent2020),tool(agent2020)]));
  assert.equal(duplicate?.code,'invalid_tools');assert.equal(duplicate?.status,400);
  assert.equal(duplicate?.message,'Every tool needs a unique function name');
});
