import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatRequest, DecisionRepair, parseDecision } from '../src/compat.js';

const request = ChatRequest.parse({
  model: 'qoder-test',
  messages: [{ role: 'user', content: 'Run synthetic commands' }],
  tools: [{ type: 'function', function: { name: 'pwsh', parameters: { type: 'object' } } }],
});
const calls = [
  { name: 'pwsh', arguments: {
    description: 'Run typecheck', command: 'npm run typecheck', workdir: 'D:\\work\\demo', timeoutMs: 300000,
  } },
  { name: 'pwsh', arguments: {
    description: 'Search with "quotes" and $(...)',
    command: 'Get-ChildItem -Recurse src | ForEach-Object { "$($_.Path):$($_.LineNumber)" }',
    workdir: 'D:\\work\\demo',
  } },
];
const expected = { kind: 'tool_calls' as const, calls };
const missingCallsKey = (value: unknown) => JSON.stringify(value)
  .replace('{"kind":"tool_calls","calls":[', '{"kind":"tool_calls":[');
const malformed = missingCallsKey(expected);

test('a missing calls key preserves every call and escaped argument', () => {
  const repairs: DecisionRepair[] = [];
  assert.deepEqual(parseDecision(malformed, request, repair => repairs.push(repair)), expected);
  assert.deepEqual(repairs, [{ kind: 'missing_calls_key', tool: 'wrapper', parameter: 'calls' }]);
});

test('a missing calls key and final call close use both deterministic repairs', () => {
  const source = malformed.replace(/}\]}$/, ']}');
  const repairs: DecisionRepair[] = [];
  assert.deepEqual(parseDecision(source, request, repair => repairs.push(repair)), expected);
  assert.deepEqual(repairs.map(repair => repair.kind), ['missing_calls_key', 'call_wrapper_close']);
});

test('a missing calls key with duplicated closers follows the existing batch repair', () => {
  const source = malformed.slice(0, -3) + ']}]}';
  const repairs: DecisionRepair[] = [];
  assert.deepEqual(parseDecision(source, request, repair => repairs.push(repair)), expected);
  assert.deepEqual(repairs.map(repair => repair.kind),
    ['missing_calls_key', 'call_wrapper_close', 'redundant_decision_closers']);
});

test('a truncated argument after calls-key repair throws the original JSON error', () => {
  const source = '{"kind":"tool_calls":[{"name":"pwsh","arguments":{"command":"truncated';
  let original: Error | undefined;
  try { JSON.parse(source); } catch (error) {
    assert(error instanceof Error);
    original = error;
  }
  assert(original);
  const repairs: DecisionRepair[] = [];
  assert.throws(() => parseDecision(source, request, repair => repairs.push(repair)), error => {
    assert(error instanceof Error);
    assert.equal(error.message, original.message);
    return true;
  });
  assert.deepEqual(repairs, []);
});

test('calls-key repair rejects trailing prose', () => {
  const repairs: DecisionRepair[] = [];
  assert.throws(() => parseDecision(malformed + ' trailing', request, repair => repairs.push(repair)));
  assert.deepEqual(repairs, []);
});

test('a complete decision after a malformed missing-calls-key block is adopted', () => {
  const missingClose = malformed.replace(/}\]}$/, ']}');
  for (const source of [
    malformed + JSON.stringify(expected),
    malformed + '\n' + JSON.stringify(expected),
    missingClose + JSON.stringify(expected),
    missingClose + '\n' + JSON.stringify(expected),
  ]) {
    const repairs: DecisionRepair[] = [];
    assert.deepEqual(parseDecision(source, request, repair => repairs.push(repair)), expected);
    assert.deepEqual(repairs, []);
  }
});

test('a calls-like prefix inside a standard batch argument remains data', () => {
  const decision = { kind: 'tool_calls' as const, calls: [{ name: 'pwsh', arguments: {
    command: 'Write literal {"kind":"tool_calls":[ and $(...) without changes',
  } }] };
  const repairs: DecisionRepair[] = [];
  assert.deepEqual(parseDecision(JSON.stringify(decision), request, repair => repairs.push(repair)), decision);
  assert.deepEqual(repairs, []);
});

test('one call keeps the existing batch result shape after calls-key repair', () => {
  const decision = { kind: 'tool_calls' as const, calls: [calls[0]!] };
  const repairs: DecisionRepair[] = [];
  assert.deepEqual(parseDecision(missingCallsKey(decision), request, repair => repairs.push(repair)), decision);
  assert.deepEqual(repairs.map(repair => repair.kind), ['missing_calls_key']);
});

test('a missing call key preserves the single call and reports its repair', () => {
  const call = calls[0]!;
  const source = '{"kind":"tool_call":' + JSON.stringify(call) + '}';
  const repairs: DecisionRepair[] = [];
  assert.deepEqual(parseDecision(source, request, repair => repairs.push(repair)), { kind: 'tool_call', ...call });
  assert.deepEqual(repairs, [{ kind: 'missing_call_key', tool: 'pwsh', parameter: 'call' }]);
});
