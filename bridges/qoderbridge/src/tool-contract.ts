import Ajv from 'ajv';
import Ajv2020Module from 'ajv/dist/2020.js';
import Ajv2019Module from 'ajv/dist/2019.js';
import type {ChatRequest} from './compat.js';

// HTTP bodies recreate schema objects. A process-wide Ajv.compile(object)
// cache would keep each copy forever; key by content and bound retained validators.
const validators=new Map<string,ReturnType<InstanceType<typeof Ajv.default>['compile']>>();
const MAX_VALIDATORS=128;
const AJV_OPTIONS={allErrors:true,strict:false,validateFormats:false};
// Clients may declare 2020-12 or 2019-09; the default draft-07 instance cannot
// resolve either meta-schema. A fresh instance per compile keeps $id namespaces
// of independent client catalogs apart, so the dialect choice only picks a class.
function ajvFor(dialect:'default'|'2020'|'2019'):InstanceType<typeof Ajv.default>{
  // The draft entry points expose the constructor as both module value and default.
  if(dialect==='2020')return new Ajv2020Module.default({...AJV_OPTIONS}) as unknown as InstanceType<typeof Ajv.default>;
  if(dialect==='2019')return new Ajv2019Module.default({...AJV_OPTIONS}) as unknown as InstanceType<typeof Ajv.default>;
  return new Ajv.default({...AJV_OPTIONS});
}
type Dialect='default'|'2020'|'2019'|'unknown';
// The schema's own $schema marker selects the validator dialect.
function schemaDialect(schema:object|boolean):Dialect{
  const value=(schema as {$schema?:unknown}).$schema;
  if(typeof value!=='string')return 'default';
  const uri=value.trim().replace(/#$/,'');
  if(/^https?:\/\/json-schema\.org\/draft\/2020-12\/schema$/.test(uri))return '2020';
  if(/^https?:\/\/json-schema\.org\/draft\/2019-09\/schema$/.test(uri))return '2019';
  if(/^https?:\/\/json-schema\.org\/draft-0[67]\/schema$/.test(uri))return 'default';
  return 'unknown';
}
export function withoutTopSchema<T>(schema:T):T{
  if(!schema||typeof schema!=='object'||Array.isArray(schema)||!Object.hasOwn(schema,'$schema'))return schema;
  const {$schema,...rest}=schema as Record<string,unknown>;
  return rest as T;
}
export function toolValidator(schema:object|boolean){
  const key=JSON.stringify(schema);
  let validate=validators.get(key);
  if(validate){validators.delete(key);validators.set(key,validate);return validate;}
  const dialect=typeof schema==='object'?schemaDialect(schema):'default';
  // An unrecognized marker names no known dialect; drop it and use the default.
  const target=dialect==='unknown'?withoutTopSchema(schema):schema;
  // Isolate $id namespaces across independent client tool catalogs.
  validate=ajvFor(dialect==='unknown'?'default':dialect).compile(target);
  validators.set(key,validate);
  if(validators.size>MAX_VALIDATORS)validators.delete(validators.keys().next().value!);
  return validate;
}
export function assertToolContract(request:ChatRequest){
  const names=new Set<string>();
  for(const tool of request.tools??[]){
    const {name,parameters}=tool.function;
    if(names.has(name))throw new Error(`Duplicate tool name: ${name}`);
    names.add(name);
    if(parameters===undefined)continue;
    if(parameters===null||Array.isArray(parameters)||!['object','boolean'].includes(typeof parameters))
      throw new Error(`Invalid JSON schema for tool ${name}`);
    if(parameters===false)throw new Error(`Tool ${name} has an unsatisfiable false schema`);
    toolValidator(parameters as object|boolean);
  }
  const choice=request.tool_choice;
  if(typeof choice==='string'&&!['auto','none','required'].includes(choice))throw new Error('Invalid tool_choice');
  if(choice==='required'&&!names.size)throw new Error('tool_choice requires at least one supplied tool');
  if(choice&&typeof choice==='object'&&'function' in choice){
    const name=(choice.function as {name?:unknown}|null)?.name;
    if(typeof name!=='string'||!names.has(name))throw new Error('tool_choice selects an unavailable tool');
  }
}
