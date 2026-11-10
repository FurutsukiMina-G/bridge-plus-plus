import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import {ChatRequest,toolDefinitions} from '../src/compat.js';
import {assertToolContract,toolValidator} from '../src/tool-contract.js';

const uri2020 = 'https://json-schema.org/draft/2020-12/schema';
const uri2019 = 'https://json-schema.org/draft/2019-09/schema';
const uri7 = 'http://json-schema.org/draft-07/schema#';
const body = (parameters: object|boolean) => ChatRequest.parse({ model: 'qoder-deepseek-flash',
  messages: [{ role: 'user', content: 'fixture' }], tools: [{ type: 'function', function: { name: 'agent', parameters } }] });

// The observed defect: Ajv's default instance is draft-07 and cannot resolve the
// 2020-12 meta-schema, so a client that declares it failed before any inference.
const agent2020 = { $schema: uri2020, type: 'object', propertyNames: { pattern: '^[a-z_]+$' },
  properties: { name: { type: 'string' }, count: { type: 'integer', exclusiveMinimum: 0 } }, required: ['name'] };

test('the default draft-07 instance cannot resolve a declared 2020-12 schema', () => {
  assert.throws(() => new Ajv.default({ allErrors: true, strict: false, validateFormats: false }).compile(agent2020),
    /no schema with key or ref/i);
});

test('a 2020-12 tool schema compiles and still enforces propertyNames and numeric exclusiveMinimum', () => {
  const validate = toolValidator(agent2020);
  assert.equal(validate({ name: 'x', count: 1 }), true);
  assert.equal(validate({ name: 'x', count: 0 }), false);
  assert.equal(validate({ name: 'x', Bad: 1 }), false);
  assert.equal(validate({ count: 1 }), false);
  const request = body(agent2020);
  assertToolContract(request);
  const parameters = toolDefinitions(request, true)[0]!.parameters as Record<string, unknown>;
  assert.equal(Object.hasOwn(parameters, '$schema'), false);
  assert.deepEqual(parameters.propertyNames, { pattern: '^[a-z_]+$' });
  assert.deepEqual((parameters.properties as Record<string, unknown>).count, { type: 'integer', exclusiveMinimum: 0 });
  assert.deepEqual((toolDefinitions(request)[0]!.parameters as Record<string, unknown>).properties,
    (parameters.properties as Record<string, unknown>));
});

test('a 2019-09 tool schema uses the 2019 dialect', () => {
  const validate = toolValidator({ $schema: uri2019, type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } },
    dependentRequired: { a: ['b'] } });
  assert.equal(validate({ a: 'x', b: 'y' }), true);
  assert.equal(validate({}), true);
  assert.equal(validate({ a: 'x' }), false);
});

test('declared draft-07, undeclared and unrecognized schemas keep the default dialect', () => {
  const shape = { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false };
  for (const schema of [{ $schema: uri7, ...shape }, shape, { $schema: 'https://example.test/unknown/schema', ...shape }]) {
    const validate = toolValidator(schema);
    assert.equal(validate({ path: 'a.ts' }), true);
    assert.equal(validate({}), false);
    assert.equal(validate({ path: 'a.ts', extra: 1 }), false);
  }
  const parameters = toolDefinitions(body({ $schema: 'https://example.test/unknown/schema', ...shape }), true)[0]!
    .parameters as Record<string, unknown>;
  assert.equal(Object.hasOwn(parameters, '$schema'), false);
  assert.deepEqual(parameters.required, ['path']);
});

test('a schema that stays invalid after dialect selection is still rejected before inference', () => {
  assert.throws(() => toolValidator({ $schema: uri2020, type: 'not-a-type' }));
  assert.throws(() => assertToolContract(body({ $schema: uri2020, type: 'not-a-type' })));
  assert.throws(() => assertToolContract(body(false)));
});
