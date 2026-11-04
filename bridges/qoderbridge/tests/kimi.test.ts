import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { ModelInfo } from '@qodercn-ai/qodercn-agent-sdk';
import { bridgeModel, selectModel } from '../src/model.js';
import { cacheFromCredits } from '../src/billing.js';
import { createBridgeServer } from '../src/server.js';
import type { Config, runProbe } from '../src/client.js';

const kimi: ModelInfo = { value: 'kmodel_latest', displayName: 'Kimi-K3.1-Pro', description: '', isEnabled: true,
  context_config: { '1M': { token_count: 1_000_000 }, '400K': { token_count: 400_000 }, '200K': { token_count: 200_000 } },
  thinking_config: { enabled: { efforts: { low: {}, high: {}, max: {} } } }, maxOutputTokens: 32000 };

test('Kimi selection pins the catalog identity and refuses alias drift, disabled models and unsupported settings', () => {
  const spec = bridgeModel('qoder-kimi-k3.1-pro')!;
  const config = { model: spec.runtimeId, expectedModelName: spec.expectedModelName, context: spec.contextWindow, reasoning: 'max' };
  assert.deepEqual(selectModel([kimi], config), { model: 'kmodel_latest', parameters: { contextWindow: 1_000_000, reasoningEffort: 'max' } });
  assert.throws(() => selectModel([{ ...kimi, displayName: 'Kimi-K3.2-Pro' }], config), /Model identity changed/);
  assert.throws(() => selectModel([{ ...kimi, value: 'kmodel', displayName: 'Kimi-K2.8-Preview' }], config), /found 0/);
  assert.throws(() => selectModel([{ ...kimi, isEnabled: false }], config), /found 0/);
  assert.throws(() => selectModel([kimi], { ...config, reasoning: 'none' }), /Unsupported reasoning/);
  assert.throws(() => selectModel([kimi], { ...config, context: 256_000 }), /Unsupported context/);
});

test('Kimi JSON tools and SSE route through the version guard with each declared window and effort', async () => {
  const seen: Config[] = [];
  const fake = (async (config: Config) => {
    seen.push(config);
    const response = seen.length === 1 ? { kind: 'tool_call', name: 'echo_fixture', arguments: { text: '中文 Kimi fixture' } }
      : { kind: 'final', content: 'KIMI_OK' };
    return { response: JSON.stringify(response), error: null, stage: 'inference' };
  }) as unknown as typeof runProbe;
  await mkdir('.runtime', { recursive: true });
  const server = await createBridgeServer({ auth: 'cli', timeout: 5000, strategy: 'permission', system: 'test', reasoning: 'max' },
    { port: 0, key: 'test', infer: fake, reportDir: await mkdtemp(resolve('.runtime/kimi-tests-')) });
  const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const headers = { authorization: 'Bearer test', 'content-type': 'application/json' };
  try {
    const listed = await fetch(`${root}/v1/models`, { headers }).then(r => r.json());
    const variants = listed.data.filter((model: { id: string }) => model.id.startsWith('qoder-kimi-'));
    assert.deepEqual(variants.map((model: { context_window: number; reasoning_efforts: string[] }) => [model.context_window, model.reasoning_efforts]),
      [[1_000_000, ['low', 'high', 'max']], [400_000, ['low', 'high', 'max']], [200_000, ['low', 'high', 'max']]]);
    for (const [index, model] of variants.entries()) {
      const response = await fetch(`${root}/v1/chat/completions`, { method: 'POST', headers, body: JSON.stringify({
        model: model.id, reasoning_effort: ['low', 'high', 'max'][index], stream: index === 2,
        prompt_cache_key: 'same-client-model-switch', messages: [{ role: 'user', content: 'fixture' }],
        tools: [{ type: 'function', function: { name: 'echo_fixture', parameters: { type: 'object',
          properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false } } }],
      }) });
      assert.equal(response.status, 200);
      if (index === 2) {
        const events = (await response.text()).split('\n\n').filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)));
        assert.ok(events.every(event => event.model === model.id));
        assert.ok(events.some(event => event.choices?.[0]?.delta.content === 'KIMI_OK'));
      } else {
        const result = await response.json();
        assert.equal(result.model, model.id);
        if (index === 0) {
          const call = result.choices[0].message.tool_calls[0];
          assert.equal(call.function.name, 'echo_fixture');
          assert.deepEqual(JSON.parse(call.function.arguments), { text: '中文 Kimi fixture' });
        } else assert.equal(result.choices[0].message.content, 'KIMI_OK');
      }
    }
    assert.deepEqual(seen.map(config => [config.model, config.expectedModelName, config.context, config.reasoning]),
      [['kmodel_latest', 'Kimi-K3.1-Pro', 1_000_000, 'low'], ['kmodel_latest', 'Kimi-K3.1-Pro', 400_000, 'high'],
        ['kmodel_latest', 'Kimi-K3.1-Pro', 200_000, 'max']]);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('Kimi credits never use a DeepSeek tariff to fabricate cache hits', () => {
  assert.equal(cacheFromCredits({ model: 'kmodel_latest', promptTokens: 10_000, outputTokens: 100,
    credits: 0.1, at: new Date('2026-10-24T04:00:00Z') }), null);
});
