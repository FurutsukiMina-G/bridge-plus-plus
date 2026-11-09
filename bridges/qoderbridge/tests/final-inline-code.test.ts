import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatRequest, DecisionRepair, parseDecision } from '../src/compat.js';

const request = ChatRequest.parse({
  model: 'qoder-test',
  messages: [{ role: 'user', content: 'Explain the parser modules' }],
  tools: [{ type: 'function', function: { name: 'read', parameters: {
    type: 'object',
    properties: { file_path: { type: 'string' } },
    required: ['file_path'],
  } } }],
});

test('Chinese final reply with DSML marker inside inline code is accepted with original content', () => {
  const single = '已完成梳理：\n- **dsml-attributes.ts** — 负责把旧式“属性写法”的 DSML（如 `｜｜DSML｜｜ param="value"`）严格解码为工具调用决策。';
  const double = '已完成梳理：双反引号行内代码 ``｜｜DSML｜｜ `param`="value"`` 同样保留原文。';
  for (const source of [single, double]) {
    const repairs: DecisionRepair[] = [];
    assert.deepEqual(parseDecision(source, request, repair => repairs.push(repair)), {
      kind: 'final',
      content: source,
    });
    assert.deepEqual(repairs, []);
  }
});

test('final reply with {"kind":"final"} inside inline code is accepted as final', () => {
  const source = '在 JSON 决策协议中，最终文本回答可以使用 `{"kind":"final"}` 外壳标识。';
  const repairs: DecisionRepair[] = [];
  assert.deepEqual(parseDecision(source, request, repair => repairs.push(repair)), {
    kind: 'final',
    content: source,
  });
  assert.deepEqual(repairs, []);
});

test('DSML invoke tag outside inline code still throws', () => {
  const source = '先说明 `dsml-attributes.ts` 的作用，然后调用工具：\n<｜｜DSML｜｜ invoke name="read">';
  assert.throws(() => parseDecision(source, request));
});

test('fenced code block containing a complete DSML call or DSML fragment is never treated as final', () => {
  const fencedCall = [
    '下面是代码块：',
    '```xml',
    '<｜｜DSML｜｜ calls>',
    '<｜｜DSML｜｜ invoke name="read">',
    '<｜｜DSML｜｜ parameter name="file_path" string="true">D:\\work\\a.ts</｜｜DSML｜｜ parameter>',
    '</｜｜DSML｜｜ invoke>',
    '</｜｜DSML｜｜ calls>',
    '```',
  ].join('\n');
  const decision = parseDecision(fencedCall, request);
  assert.notEqual(decision.kind, 'final');
  assert.deepEqual(decision, {
    kind: 'tool_call',
    name: 'read',
    arguments: { file_path: 'D:\\work\\a.ts' },
  });

  const fencedFragment = [
    '下面是代码块：',
    '```xml',
    '｜｜DSML｜｜ param="value"',
    '```',
  ].join('\n');
  assert.throws(() => parseDecision(fencedFragment, request));
});

test('unpaired single backtick on a line is not treated as inline code and still throws', () => {
  const source = '已完成梳理：如 `｜｜DSML｜｜ param="value" 所示。';
  assert.throws(() => parseDecision(source, request));
});
