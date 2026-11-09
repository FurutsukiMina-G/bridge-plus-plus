import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatRequest, parseDecision, type DecisionRepair } from '../src/compat.js';

const readRequest = ChatRequest.parse({
  model: 'qoder-deepseek-flash',
  messages: [{ role: 'user', content: 'Inspect D:\\some dir\\a.ts' }],
  tools: [{
    type: 'function',
    function: {
      name: 'read',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string' },
          offset: { type: 'number' },
          limit: { type: 'number' },
        },
        required: ['file_path'],
        additionalProperties: false,
      },
    },
  }],
});

const observedBatch = `<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="read">
<｜｜DSML｜｜ parameter name="file_path" string="true">D:\\some dir\\a.ts</parameter>
<｜｜DSML｜｜ parameter name="offset" string="false">1</parameter>
<｜｜DSML｜｜ parameter name="limit" string="false">130</parameter>
</｜｜DSML｜｜ parameter>
<｜｜DSML｜｜ invoke>
<｜｜DSML｜｜ invoke name="read">
<｜｜DSML｜｜ parameter name="file_path" string="true">D:\\some dir\\a.ts</parameter>
<｜｜DSML｜｜ parameter name="offset" string="false">270</parameter>
<｜｜DSML｜｜ parameter name="limit" string="false">120</parameter>
</｜｜DSML｜｜ parameter>
<｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>`;

test('tolerates observed DSML loose parameter and invoke closing markers with numeric JSON arguments', () => {
  const repairs: DecisionRepair[] = [];
  const decision = parseDecision(observedBatch, readRequest, r => repairs.push(r));
  assert.deepEqual(decision, {
    kind: 'tool_calls',
    calls: [
      { name: 'read', arguments: { file_path: 'D:\\some dir\\a.ts', offset: 1, limit: 130 } },
      { name: 'read', arguments: { file_path: 'D:\\some dir\\a.ts', offset: 270, limit: 120 } },
    ],
  });
  if (decision.kind !== 'tool_calls') assert.fail('expected tool_calls');
  assert.equal(typeof decision.calls[0]!.arguments.offset, 'number');
  assert.equal(typeof decision.calls[0]!.arguments.limit, 'number');
  assert.ok(repairs.length > 0 && repairs.every(r => r.kind === 'loose_closing_marker'));
});

test('accepts parameter-only, invoke-only and structural closing marker variants inside a complete calls wrapper', () => {
  const onlyParameter = `<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="read">
<｜｜DSML｜｜ parameter name="file_path" string="true">D:\\some dir\\a.ts</parameter>
<｜｜DSML｜｜ parameter name="offset" string="false">1</parameter>
<｜｜DSML｜｜ parameter name="limit" string="false">130</parameter>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>`;
  const r1: DecisionRepair[] = [];
  assert.deepEqual(parseDecision(onlyParameter, readRequest, r => r1.push(r)), {
    kind: 'tool_call',
    name: 'read',
    arguments: { file_path: 'D:\\some dir\\a.ts', offset: 1, limit: 130 },
  });
  assert.deepEqual(r1.map(r => r.parameter), ['file_path', 'offset', 'limit']);

  const onlyInvoke = `<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="read">
<｜｜DSML｜｜ parameter name="file_path" string="true">D:\\some dir\\a.ts</｜｜DSML｜｜ parameter>
<｜｜DSML｜｜ parameter name="offset" string="false">1</｜｜DSML｜｜ parameter>
<｜｜DSML｜｜ parameter name="limit" string="false">130</｜｜DSML｜｜ parameter>
</invoke>
</｜｜DSML｜｜ calls>`;
  const r2: DecisionRepair[] = [];
  assert.deepEqual(parseDecision(onlyInvoke, readRequest, r => r2.push(r)), {
    kind: 'tool_call',
    name: 'read',
    arguments: { file_path: 'D:\\some dir\\a.ts', offset: 1, limit: 130 },
  });
  assert.deepEqual(r2, [{ kind: 'loose_closing_marker', tool: 'read', parameter: 'invoke' }]);

  const structuralVariants = `<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="read">
<｜｜DSML｜｜ parameter name="file_path" string="true">D:\\some dir\\a.ts</｜DSML｜parameter>
<｜｜DSML｜｜ parameter name="offset" string="false">1</｜｜DSML｜｜ parameter name="offset" string="false">
<｜｜DSML｜｜ invoke name="read">
<｜｜DSML｜｜ parameter name="file_path" string="true">D:\\some dir\\b.ts</parameter name="file_path">
<｜｜DSML｜｜ parameter name="limit" string="false">50</parameter>
</｜｜DSML｜｜ calls>`;
  const r3: DecisionRepair[] = [];
  assert.deepEqual(parseDecision(structuralVariants, readRequest, r => r3.push(r)), {
    kind: 'tool_calls',
    calls: [
      { name: 'read', arguments: { file_path: 'D:\\some dir\\a.ts', offset: 1 } },
      { name: 'read', arguments: { file_path: 'D:\\some dir\\b.ts', limit: 50 } },
    ],
  });
  assert.ok(r3.every(r => r.kind === 'loose_closing_marker'));
});

test('rejects values containing closing markers, invalid string="false" JSON, undeclared fields and unclosed calls', () => {
  const embeddedParameterCloser = observedBatch.replace('D:\\some dir\\a.ts', 'D:\\some </parameter> dir\\a.ts');
  const embeddedInCanonical = `<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="read">
<｜｜DSML｜｜ parameter name="file_path" string="true">D:\\some </parameter> dir\\a.ts</｜｜DSML｜｜ parameter>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>`;
  const embeddedTrailingParameterCloser = `<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="read">
<｜｜DSML｜｜ parameter name="file_path" string="true">D:\\some dir\\a.ts</parameter></parameter>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>`;
  const embeddedInvokeCloser = observedBatch.replace('D:\\some dir\\a.ts', 'D:\\some </invoke> dir\\a.ts');
  const invalidJsonNumber = observedBatch.replace('>1</parameter>', '>130px</parameter>');
  const invalidJsonStringFalse = observedBatch.replace('name="file_path" string="true"', 'name="file_path" string="false"');
  const undeclaredParameter = observedBatch.replace('name="limit"', 'name="undeclared_field"');
  const undeclaredTool = observedBatch.replace('invoke name="read"', 'invoke name="unknown_tool"');
  const unclosedCalls = observedBatch.replace(/\s*<\/｜｜DSML｜｜ calls>\s*$/, '');
  const missingCallsOpener = observedBatch.replace(/^<｜｜DSML｜｜ calls>\s*/, '');

  const openSchemaRequest = ChatRequest.parse({
    ...readRequest,
    tools: [{
      type: 'function',
      function: {
        name: 'read',
        parameters: { type: 'object', properties: { file_path: { type: 'string' }, offset: { type: 'number' }, limit: { type: 'number' } } },
      },
    }],
  });

  for (const [source, req] of [
    [embeddedParameterCloser, readRequest],
    [embeddedInCanonical, readRequest],
    [embeddedTrailingParameterCloser, readRequest],
    [embeddedInvokeCloser, readRequest],
    [invalidJsonNumber, readRequest],
    [invalidJsonStringFalse, readRequest],
    [undeclaredParameter, readRequest],
    [undeclaredParameter, openSchemaRequest],
    [undeclaredTool, readRequest],
    [unclosedCalls, readRequest],
    [missingCallsOpener, readRequest],
  ] as const) {
    const repairs: DecisionRepair[] = [];
    assert.throws(() => parseDecision(source, req, r => repairs.push(r)));
    assert.deepEqual(repairs, []);
  }
});

test('enforces parallel_tool_calls:false after repairing loose DSML closing markers', () => {
  const serialRequest = ChatRequest.parse({ ...readRequest, parallel_tool_calls: false });
  const repairs: DecisionRepair[] = [];
  assert.throws(
    () => parseDecision(observedBatch, serialRequest, r => repairs.push(r)),
    /parallel_tool_calls false permits only one host call/,
  );
  assert.deepEqual(repairs, []);
});

test('repairs extra angle brackets before parameter/invoke keywords and terminal calls opener while preserving edit new_string', () => {
  const editRequest = ChatRequest.parse({
    model: 'qoder-deepseek-flash',
    messages: [{ role: 'user', content: 'Update D:\\some dir\\a.ts' }],
    tools: [{
      type: 'function',
      function: {
        name: 'edit',
        parameters: {
          type: 'object',
          properties: {
            file_path: { type: 'string' },
            old_string: { type: 'string' },
            new_string: { type: 'string' },
          },
          required: ['file_path', 'old_string', 'new_string'],
          additionalProperties: false,
        },
      },
    }],
  });

  const newText = '  if (a > b) {\n    return "new text";\n  }\n';
  const variant = `<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="edit">
<｜｜DSML｜｜ parameter name="file_path">D:\\some dir\\a.ts</｜｜DSML｜｜ parameter>
<｜｜DSML｜｜ parameter name="old_string" string="true">old text</｜｜DSML｜｜ parameter>
<｜｜DSML｜｜> parameter name="new_string">${newText}</｜｜DSML｜｜> parameter>
</｜｜DSML｜｜> invoke>
<｜｜DSML｜｜ calls>`;

  const repairs: DecisionRepair[] = [];
  const decision = parseDecision(variant, editRequest, r => repairs.push(r));
  assert.deepEqual(decision, {
    kind: 'tool_call',
    name: 'edit',
    arguments: {
      file_path: 'D:\\some dir\\a.ts',
      old_string: 'old text',
      new_string: newText,
    },
  });
  assert.deepEqual(repairs, [
    { kind: 'loose_closing_marker', tool: 'edit', parameter: 'new_string' },
    { kind: 'loose_closing_marker', tool: 'edit', parameter: 'invoke' },
    { kind: 'loose_closing_marker', tool: 'wrapper', parameter: 'calls' },
  ]);

  for (const bad of [
    variant.replace(/^<｜｜DSML｜｜ calls>/, '<｜｜DSML｜｜> calls>'),
    variant.replace('<｜｜DSML｜｜ invoke name="edit">', '<｜｜DSML｜｜> invoke name="edit">'),
    variant + ' trailing',
    variant.replace(/\s*<｜｜DSML｜｜ calls>$/, ''),
    `${variant}\n<｜｜DSML｜｜ invoke name="edit"><｜｜DSML｜｜ parameter name="file_path">D:\\some dir\\a.ts</｜｜DSML｜｜ parameter><｜｜DSML｜｜ parameter name="old_string">x</｜｜DSML｜｜ parameter><｜｜DSML｜｜ parameter name="new_string">y</｜｜DSML｜｜ parameter></｜｜DSML｜｜ invoke></｜｜DSML｜｜ calls>`,
  ]) {
    const badRepairs: DecisionRepair[] = [];
    assert.throws(() => parseDecision(bad, editRequest, r => badRepairs.push(r)));
    assert.deepEqual(badRepairs, []);
  }
});
