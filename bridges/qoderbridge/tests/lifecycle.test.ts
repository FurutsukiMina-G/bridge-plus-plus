import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RequestSlots } from '../src/async.js';
import { QoderPool } from '../src/pool.js';
import { ChatRequest } from '../src/compat.js';
import { IsolationCache } from '../src/isolation-cache.js';
import { DISABLED_RUNTIME_MEMORY, runtimeMemory, startupTransport, type StartupAttempt } from '../src/startup-phases.js';
import type { Config } from '../src/client.js';

const request = ChatRequest.parse({ model: 'qoder-deepseek-flash', prompt_cache_key: 'test-session',
  messages: [{ role: 'user', content: 'Answer OK' }] });
function fakePool(timeout = 5000, stalled = false, fail = false, sdkCode?: number) {
  const config: Config = { auth: 'cli', timeout, strategy: 'permission', system: 'test' };
  let phase = 0; let prompts = 0; let closed = 0;
  const record = { id: 'fake', messages: [], touched: Date.now(), locked: Promise.resolve(),
    lastCredits: null, model: 'dfmodel', busy: 0, toolSignature: null, retryHint: null, retryMessageHash: null,
    policyCalls: [], controller: new AbortController(), warm: { close() { closed++; } },
    queue: { push() { prompts++; }, close() {} }, q: { next: async () => {
      if (stalled) return await new Promise<never>(() => {});
      if (phase++ % 2 === 0) return { done: false, value: { type: 'assistant', uuid: String(phase), session_id: 'sdk-fake',
        message: { id: String(phase), content: [{ type: 'text', text: '{"kind":"final","content":"OK"}' }],
          usage: { input_tokens: 0, output_tokens: 0 } } } };
      return { done: false, value: { type: 'result', session_id: 'sdk-fake', subtype: fail ? 'error_during_execution' : 'success', is_error: fail,
        ...(sdkCode === undefined ? {} : { error_code: sdkCode }),
        total_credits: prompts * 0.1, usage: {}, modelUsage: {} } };
    } } };
  const pool = new QoderPool(config);
  const state = pool as unknown as { nextWarm: Promise<typeof record>; primeNext: () => Promise<typeof record> };
  state.nextWarm = Promise.resolve(record); state.primeNext = () => Promise.resolve(record);
  return { pool, record, counts: () => ({ prompts, closed }) };
}

test('pooled SDK terminal errors retain structured codes through recovery and do not retry account limits', async () => {
  const { pool, counts } = fakePool(5000, false, true, 115);
  try {
    const result = await pool.infer(request);
    assert.equal(result.report.sdk_error_code, 115);
    assert.equal(result.recovery!.outcome, 'upstream_failure');
    assert.equal(result.recovery!.correctionCalls, 0); assert.equal(counts().prompts, 1);
  } finally { pool.closeAll(); }
});
test('cancelled permit waiters are removed and a release never overbooks concurrency', async () => {
  const slots = new RequestSlots(1); const first = await slots.take();
  const controller = new AbortController(); const pending = slots.take(controller.signal);
  controller.abort(new Error('cancelled'));
  await assert.rejects(pending, /cancelled/);
  const second = slots.take(); first(); const release = await second;
  assert.equal(slots.active, 1); assert.equal(slots.queued, 0);
  first(); assert.equal(slots.active, 1); release(); assert.equal(slots.active, 0);
});
test('concurrent duplicate session requests run one model turn and locally replay the answer', async () => {
  const { pool, counts } = fakePool();
  const [a, b] = await Promise.all([pool.infer(request), pool.infer(request)]);
  assert.equal(counts().prompts, 1);
  assert.equal(a.report.credits_delta, 0.1);
  assert.equal(b.report.credits_delta, 0);
  assert.equal(b.report.local_response_replay, true);
  assert.equal(b.report.model_requests, 0);
  assert.equal(b.report.normalized_usage, null);
  await pool.infer({ ...request, messages: [...request.messages, { role: 'user', content: 'Again' }] });
  assert.equal(counts().prompts, 2);
});
test('deadline closes the owned SDK session and returns an auditable failed report', async () => {
  const { pool, record, counts } = fakePool(30, true);
  const keepAlive = setTimeout(() => {}, 500);
  try {
    const turn = await pool.infer(request);
    assert.ok(turn.report.error);
    assert.equal(turn.report.stage, 'cancelled_or_timeout');
    assert.equal(turn.report.credits_delta, null);
    assert.equal(counts().closed, 1);
    assert.equal(record.busy, 0);
  } finally { clearTimeout(keepAlive); }
});
test('human approval waits retain context past twenty minutes but still release expired idle sessions', async () => {
  const { pool, record, counts } = fakePool();
  try {
    await pool.infer(request);
    const internals = pool as unknown as { sweepIdle(): void };
    record.touched = Date.now() - 30 * 60_000;
    internals.sweepIdle();
    assert.equal(counts().closed, 0);
    await pool.infer({ ...request, messages: [...request.messages, { role: 'user', content: 'Approved; continue' }] });
    assert.equal(counts().prompts, 2); assert.equal(pool.stats().sessions, 1);
    record.touched = Date.now() - 61 * 60_000;
    internals.sweepIdle(); assert.equal(counts().closed, 1);
  } finally { pool.closeAll(); }
});
test('idle cleanup never closes a busy session and rejects invalid retention configuration', async () => {
  const { pool, record, counts } = fakePool();
  try {
    await pool.infer(request); record.touched = Date.now() - 61 * 60_000; record.busy = 1;
    (pool as unknown as { sweepIdle(): void }).sweepIdle();
    assert.equal(counts().closed, 0); record.busy = 0;
  } finally { pool.closeAll(); }
  assert.throws(() => new QoderPool({ auth: 'cli', timeout: 5000, strategy: 'permission', system: 'test', sessionIdleMs: NaN }), /sessionIdleMs/);
});
test('SDK failure retains reported Credits instead of losing its whole telemetry record', async () => {
  const { pool, counts } = fakePool(5000, false, true);
  const result = await pool.infer(request);
  assert.match(result.report.error!, /error_during_execution/);
  assert.equal(result.report.credits_delta, 0.1);
  assert.equal(result.decision, null);
  assert.equal(counts().closed, 1);
});
test('cancelling a queued same-session request does not terminate its active predecessor', async () => {
  const { pool, counts } = fakePool(2000, true);
  const owner = new AbortController(); const queued = new AbortController();
  const active = pool.infer(request, { signal: owner.signal });
  await new Promise(resolve => setTimeout(resolve, 10));
  const waiting = pool.infer(request, { signal: queued.signal });
  queued.abort(new Error('queued cancelled'));
  await assert.rejects(waiting, /queued cancelled/);
  assert.equal(counts().closed, 0);
  owner.abort(new Error('owner cancelled'));
  await active;
  assert.equal(counts().closed, 1);
});

const zero = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
/** Fake SDK session that streams like Qoder: zero token fields, a context ratio, one delta per token. */
function streamingRecord(id: string, ratios: number[]) {
  const events: unknown[] = []; let turn = 0;
  const policyCalls: Array<{ purpose: string; model: string; context_window: number | null; reasoning_effort: string | null }> = [];
  const delta = (delta: unknown) => ({ type: 'stream_event', session_id: 'sdk', event: { type: 'content_block_delta', delta } });
  const record = { id, messages: [], touched: Date.now(), locked: Promise.resolve(), lastCredits: null, model: 'dfmodel',
    busy: 0, toolSignature: null, retryHint: null, retryMessageHash: null, policyCalls, closed: false,
    lastSuccessHash: null, lastDecision: null, sdkSessionId: null, lastPromptTokens: null,
    controller: new AbortController(), warm: { close() {} }, q: { next: async () => ({ done: false, value: events.shift() }) },
    queue: { close() {}, push() {
      const ratio = ratios[turn++]!;
      policyCalls.push({ purpose: 'main', model: 'dfmodel', context_window: 1_000_000, reasoning_effort: 'max' });
      events.push({ type: 'stream_event', session_id: 'sdk', event: { type: 'message_start', message: { id: `${id}-${turn}`, usage: zero } } },
        delta({ type: 'thinking_delta', thinking: 'Hm' }),
        ...['{"kind":"final",', '"content":', '"OK"}'].map(text => delta({ type: 'text_delta', text })),
        { type: 'stream_event', session_id: 'sdk', event: { type: 'message_delta', usage: { ...zero, credits: 0.01, context_usage_ratio: ratio } } },
        { type: 'result', subtype: 'success', is_error: false, session_id: 'sdk', total_credits: 0.01 * turn,
          usage: { ...zero, context_usage_ratio: ratio }, modelUsage: {} });
    } } };
  return record;
}
function streamingPool(cacheUsage: Config['cacheUsage'], ratios: number[]) {
  const pool = new QoderPool({ auth: 'cli', timeout: 5000, strategy: 'permission', system: 'test', cacheUsage });
  const opened: Array<ReturnType<typeof streamingRecord>> = [];
  (pool as unknown as { open: () => Promise<unknown> }).open = async () => {
    const record = streamingRecord(`fake-${opened.length}`, ratios); opened.push(record); return record;
  };
  return { pool, opened };
}
const next = (text: string) => ({ ...request, messages: [...request.messages, { role: 'assistant' as const, content: 'OK' },
  { role: 'user' as const, content: text }] });
test('measured usage reaches the client; cached tokens are sent only when the estimate is enabled', async () => {
  const plain = streamingPool('none', [0.00923, 0.009415]);
  const first = await plain.pool.infer(request);
  assert.deepEqual(first.report.client_usage, { prompt_tokens: 9230, completion_tokens: 4, total_tokens: 9234,
    completion_tokens_details: { reasoning_tokens: 1 } });
  const second = await plain.pool.infer(next('Again'));
  assert.equal(second.report.cache_estimate_tokens, 9216, 'logged for analysis even when not sent');
  assert.equal(second.report.client_usage?.prompt_tokens_details, undefined);
  assert.equal(second.report.client_cache_usage, 'omitted');
  plain.pool.closeAll();

  const estimated = streamingPool('estimate', [0.00923, 0.009415]);
  await estimated.pool.infer(request);
  const continued = await estimated.pool.infer(next('Again'));
  assert.deepEqual(continued.report.client_usage?.prompt_tokens_details, { cached_tokens: 9216 });
  assert.equal(continued.report.client_cache_usage, 'session_prefix_estimate');
  const replay = await estimated.pool.infer(next('Again'));
  assert.equal(replay.report.local_response_replay, true);
  // A replay sends no usage frame: zero would read as an empty context in the client's context ring.
  assert.equal(replay.report.client_usage, null);
  assert.equal(replay.report.credits_delta, 0);
  estimated.pool.closeAll();
});
test('a diverged history for the same client key closes the unreachable Qoder session', async () => {
  const { pool, opened } = streamingPool('none', [0.001, 0.001]);
  await pool.infer(request);
  await pool.infer({ ...request, messages: [{ role: 'user', content: 'A different branch' }] });
  const first = opened[0]!; const replacement = opened.find(record => record !== first && !record.closed);
  assert.equal(first.closed, true);
  assert.ok(replacement);
  assert.equal(pool.stats().sessions, 1);
  pool.closeAll();
});
test('billing mode sends the cache split solved from each request bill, with its tier', async () => {
  const { pool } = streamingPool('billing', [0.00923, 0.009415]);
  try {
    for (const turn of [await pool.infer(request), await pool.infer(next('Again'))]) {
      const report = turn.report as Record<string, unknown>;
      const billing = report.cache_billing as { cachedTokens: number; tier: string } | null;
      const usage = report.client_usage as { prompt_tokens: number; prompt_tokens_details?: { cached_tokens: number } };
      assert.ok(billing, 'the fixture bill is explainable by the tariff');
      assert.equal(report.client_cache_usage, 'credits_inverse');
      assert.equal(usage.prompt_tokens_details?.cached_tokens, billing!.cachedTokens);
      assert.ok(billing!.cachedTokens >= 0 && billing!.cachedTokens <= usage.prompt_tokens);
      assert.ok(['peak', 'off_peak'].includes(report.billing_tier as string));
    }
  } finally { pool.closeAll(); }
});
test('runtimeMemory is disabled by default without spawning PowerShell and only samples when opted in', async () => {
  let execCalls = 0;
  const unexpectedExec = (async () => { execCalls++; throw new Error('PowerShell should not be spawned'); }) as never;
  assert.deepEqual(await runtimeMemory(1234, { env: {}, exec: unexpectedExec }), DISABLED_RUNTIME_MEMORY);
  assert.deepEqual(await runtimeMemory(1234, { env: { QODER_BRIDGE_STARTUP_MEMORY: '0' }, exec: unexpectedExec }), DISABLED_RUNTIME_MEMORY);
  assert.deepEqual(await runtimeMemory(undefined, { env: { QODER_BRIDGE_STARTUP_MEMORY: '1' }, exec: unexpectedExec }), { rss_bytes: null, private_bytes: null, source: 'runtime_pid_unavailable' });
  assert.equal(execCalls, 0);
  if (process.platform === 'win32') {
    let observedTimeout = 0;
    const sampled = await runtimeMemory(4321, {
      env: { QODER_BRIDGE_STARTUP_MEMORY: '1' },
      exec: (async (_file: string, _args: readonly string[], options: { timeout?: number }) => {
        execCalls++; observedTimeout = options.timeout ?? 0;
        return { stdout: '{"rss_bytes":104857600,"private_bytes":52428800}', stderr: '' };
      }) as never,
    });
    assert.equal(execCalls, 1);
    assert.ok(observedTimeout > 0 && observedTimeout <= 500);
    assert.deepEqual(sampled, { rss_bytes: 104857600, private_bytes: 52428800, source: 'owned_process_working_set' });
    const failed = await runtimeMemory(4321, {
      env: { QODER_BRIDGE_STARTUP_MEMORY: '1' },
      exec: (async () => { throw new Error('timed out'); }) as never,
    });
    assert.deepEqual(failed, { rss_bytes: null, private_bytes: null, source: 'runtime_memory_unavailable' });
  }
  const phase: StartupAttempt = { attempt: 1, transport_kind: 'unobserved', transport_initialize_ms: null,
    sdk_startup_ms: 0, sdk_initialize_ms: null, initialization_result_ms: 0, isolate_ms: 0,
    get_available_models_ms: 0, total_ms: 0, isolation_retry: false, memory: { ...DISABLED_RUNTIME_MEMORY } };
  const options = { transport: { create: (_launch?: unknown) => ({ pid: 9876, async initialize() {}, write() {}, async *readMessages() {}, isReady: () => true, endInput() {}, async close() {} }) } };
  const pid = startupTransport(options as never, phase);
  const transport = options.transport.create({} as never);
  await transport.initialize();
  assert.equal(phase.transport_kind, 'injected');
  assert.equal(typeof phase.transport_initialize_ms, 'number');
  assert.equal(pid(), 9876);
});
test('isolation cache handles miss, hit, new plugin discovery, corruption, and identity mismatch while recording startup_phases', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'qoder-isolation-cache-'));
  const identity = { version: '1.0.50-test', fingerprint: 'fp-1' };
  let installedPlugins = ['presentations@builtin'];
  let installedSkills = ['slide-skill'];
  let listPluginsCalls = 0;
  let warmCloses = 0;
  const appliedSettingsPerStart: Array<{ enabledPlugins?: Record<string, boolean>; skillOverrides?: Record<string, string> }> = [];
  const fakeStartRuntime = (async ({ options }: { options?: { settings?: string } }) => {
    const parsed = JSON.parse(options?.settings ?? '{}') as { enabledPlugins?: Record<string, boolean>; skillOverrides?: Record<string, string> };
    appliedSettingsPerStart.push(parsed);
    let activePlugins = installedPlugins.filter(id => parsed.enabledPlugins?.[id] !== false);
    let activeSkills = installedSkills.filter(name => parsed.skillOverrides?.[name] !== 'off');
    let phase = 0;
    return {
      close() { warmCloses++; },
      query() {
        return {
          async initializationResult() { return { account: { userId: 'u-1' }, skills: activeSkills.map(name => ({ name })) }; },
          async listPlugins() { listPluginsCalls++; return activePlugins.map(id => ({ id })); },
          async applyFlagSettings(flags: { enabledPlugins?: Record<string, boolean>; skillOverrides?: Record<string, string> }) {
            activePlugins = activePlugins.filter(id => flags.enabledPlugins?.[id] !== false);
            activeSkills = activeSkills.filter(name => flags.skillOverrides?.[name] !== 'off');
          },
          async reloadPlugins() { return { error_count: 0 }; },
          async getContextUsage() { return { skills: { count: activeSkills.length, items: activeSkills.map(name => ({ name })) } }; },
          async getAvailableModels() { return [{ value: 'dfmodel', displayName: 'DeepSeek Flash', description: '', isEnabled: true }]; },
          async next() {
            const step = phase++ % 3;
            if (step === 0) return { done: false, value: { type: 'system', subtype: 'init', session_id: 'sdk-iso', qodercli_version: '0.1.99', tools: [], skills: [], plugins: [] } };
            if (step === 1) return { done: false, value: { type: 'assistant', uuid: String(phase), session_id: 'sdk-iso',
              message: { id: String(phase), content: [{ type: 'text', text: '{"kind":"final","content":"OK"}' }], usage: { input_tokens: 10, output_tokens: 2 } } } };
            return { done: false, value: { type: 'result', session_id: 'sdk-iso', subtype: 'success', is_error: false, total_credits: 0.001, usage: {}, modelUsage: {} } };
          },
        };
      },
    };
  }) as never;
  const makeConfig = (overrides: Partial<Config> = {}): Config => ({
    auth: 'cli', timeout: 5000, strategy: 'permission', system: 'test', model: 'dfmodel',
    sessionSettings: '{}', isolationCacheDir: cacheDir, isolationRuntimeIdentity: identity, blankWarmLimit: 0, ...overrides,
  });
  try {
    // 1. Cache miss: discovers plugin & skill, persists cache, retries once (2 attempts), records startup_phases.
    const poolMiss = new QoderPool(makeConfig(), fakeStartRuntime);
    try {
      const first = await poolMiss.infer(request);
      const phases = first.report.startup_phases!;
      assert.ok(phases);
      assert.equal(phases.isolation_cache.enabled, true);
      assert.equal(phases.isolation_cache.hit, false);
      assert.equal(phases.isolation_cache.status, 'ready');
      assert.equal(phases.isolation_cache.declared_cli_version, '1.0.50-test');
      assert.equal(phases.isolation_cache.cli_version, '0.1.99');
      assert.equal(phases.attempts.length, 2);
      assert.equal(phases.attempts[0]!.attempt, 1);
      assert.equal(phases.attempts[0]!.isolation_retry, true);
      assert.equal(phases.attempts[1]!.attempt, 2);
      assert.equal(phases.attempts[1]!.isolation_retry, false);
      for (const field of ['sdk_startup_ms', 'initialization_result_ms', 'isolate_ms', 'get_available_models_ms', 'total_ms'] as const) {
        assert.equal(typeof phases.attempts[1]![field], 'number');
      }
      assert.deepEqual(phases.attempts[1]!.memory, DISABLED_RUNTIME_MEMORY);
      assert.equal(appliedSettingsPerStart[0]?.enabledPlugins?.['presentations@builtin'], undefined);
      assert.equal(appliedSettingsPerStart[1]?.enabledPlugins?.['presentations@builtin'], false);
      assert.equal(appliedSettingsPerStart[1]?.skillOverrides?.['slide-skill'], 'off');
      assert.equal(warmCloses, 1);
      const reused = await poolMiss.infer({ ...request, messages: [...request.messages, { role: 'user', content: 'Follow up' }] });
      assert.equal(reused.report.reused_session, true);
      assert.equal(reused.report.startup_phases, null);
    } finally { poolMiss.closeAll(); }

    // 2. Cache hit: applies cached disable list on attempt 1, still runs isolateSession check, finishes in 1 attempt.
    const callsBeforeHit = listPluginsCalls;
    const startsBeforeHit = appliedSettingsPerStart.length;
    const poolHit = new QoderPool(makeConfig(), fakeStartRuntime);
    try {
      const hitTurn = await poolHit.infer(request);
      const phases = hitTurn.report.startup_phases!;
      assert.equal(phases.isolation_cache.hit, true);
      assert.equal(phases.isolation_cache.cli_version, '0.1.99');
      assert.equal(phases.attempts.length, 1);
      assert.equal(phases.attempts[0]!.isolation_retry, false);
      assert.equal(appliedSettingsPerStart[startsBeforeHit]?.enabledPlugins?.['presentations@builtin'], false);
      assert.equal(appliedSettingsPerStart[startsBeforeHit]?.skillOverrides?.['slide-skill'], 'off');
      assert.ok(listPluginsCalls > callsBeforeHit, 'isolateSession verification still runs on cache hit');
    } finally { poolHit.closeAll(); }

    // 3. Cache hit + newly installed plugin: discovers new plugin, updates cache, retries once.
    installedPlugins = ['presentations@builtin', 'extra-plugin@user'];
    const poolNewPlugin = new QoderPool(makeConfig(), fakeStartRuntime);
    let cacheFile = '';
    try {
      const turn = await poolNewPlugin.infer(request);
      const phases = turn.report.startup_phases!;
      assert.equal(phases.isolation_cache.hit, true);
      assert.equal(phases.attempts.length, 2);
      assert.equal(phases.attempts[0]!.isolation_retry, true);
      assert.equal(phases.attempts[1]!.isolation_retry, false);
      const verifyCache = await IsolationCache.open(cacheDir, '{}', undefined, identity);
      cacheFile = verifyCache.file;
      assert.equal(verifyCache.hit, true);
      assert.deepEqual(new Set(verifyCache.plugins), new Set(['presentations@builtin', 'extra-plugin@user']));
      assert.deepEqual(verifyCache.skills, ['slide-skill']);
    } finally { poolNewPlugin.closeAll(); }

    // 4. Corrupted cache file: falls back to miss, never skips verification, repairs cache.
    await writeFile(cacheFile, '{corrupted json', 'utf8');
    const callsBeforeCorrupt = listPluginsCalls;
    const poolCorrupt = new QoderPool(makeConfig(), fakeStartRuntime);
    try {
      const turn = await poolCorrupt.infer(request);
      assert.equal(turn.report.startup_phases!.isolation_cache.hit, false);
      assert.equal(turn.report.startup_phases!.attempts.length, 2);
      assert.ok(listPluginsCalls > callsBeforeCorrupt);
    } finally { poolCorrupt.closeAll(); }

    // 5. Identity mismatch (version, fingerprint, settings, or tampered file metadata): never skips verification.
    const callsBeforeMismatch = listPluginsCalls;
    const otherIdentity = { version: '1.0.51-other', fingerprint: 'fp-1' };
    const poolMismatch = new QoderPool(makeConfig({ isolationRuntimeIdentity: otherIdentity }), fakeStartRuntime);
    try {
      const turn = await poolMismatch.infer(request);
      assert.equal(turn.report.startup_phases!.isolation_cache.hit, false);
      assert.equal(turn.report.startup_phases!.attempts.length, 2);
      assert.ok(listPluginsCalls > callsBeforeMismatch);
    } finally { poolMismatch.closeAll(); }

    const otherCache = await IsolationCache.open(cacheDir, '{}', undefined, otherIdentity);
    const rawCache = JSON.parse(await readFile(otherCache.file, 'utf8')) as Record<string, unknown>;
    await writeFile(otherCache.file, JSON.stringify({ ...rawCache, settings_sha256: 'tampered' }), 'utf8');
    const tampered = await IsolationCache.open(cacheDir, '{}', undefined, otherIdentity);
    assert.equal(tampered.hit, false);
    assert.deepEqual(tampered.plugins, []);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});
test('one-shot requests claim prewarmed blank runtimes, replenish in background, and release native runtime on completion', async () => {
  const { pool, opened } = streamingPool('none', [0.001, 0.001, 0.001, 0.001]);
  const oneShotReq = ChatRequest.parse({ model: 'qoder-deepseek-flash', bridge_scope: 'dsh-review',
    messages: [{ role: 'system', content: 'Review tool call' }, { role: 'user', content: 'Check safety' }] });
  try {
    await pool.prewarm();
    assert.equal(pool.stats().prewarmed, true);
    assert.equal(pool.stats().blank_runtimes.ready, 1);
    const firstRecord = opened[0]!;
    const firstTurn = await pool.infer(oneShotReq);
    assert.equal(firstTurn.report.warm_start, true);
    assert.equal(firstTurn.record, firstRecord);
    assert.equal((firstRecord as { nativeReleased?: boolean }).nativeReleased, true);
    assert.equal(firstRecord.controller.signal.aborted, true);
    // Released one-shot runtimes do not occupy conversation pool slots, while blank runtimes are replenished.
    assert.equal(pool.stats().sessions, 0);
    assert.equal(pool.stats().blank_runtimes.target, 2);
    assert.ok(opened.length >= 2, 'blank runtime replenished in background after prewarmed runtime was claimed');
    // Identical one-shot retry within 120s replays locally without consuming another runtime.
    const replayTurn = await pool.infer(oneShotReq);
    assert.equal(replayTurn.report.local_response_replay, true);
    assert.equal(replayTurn.report.model_requests, 0);
    assert.equal(pool.stats().sessions, 0);
    // Distinct one-shot request in the same scope does not match the released runtime and claims a replenished blank runtime.
    const secondOneShot = ChatRequest.parse({ model: 'qoder-deepseek-flash', bridge_scope: 'dsh-review',
      messages: [{ role: 'system', content: 'Review tool call' }, { role: 'user', content: 'Another check' }] });
    const secondTurn = await pool.infer(secondOneShot);
    assert.equal(secondTurn.report.reused_session, false);
    assert.equal(secondTurn.report.warm_start, true);
    assert.notEqual(secondTurn.record, firstRecord);
    assert.equal(secondTurn.record.nativeReleased, true);
    assert.equal(pool.stats().sessions, 0);
  } finally { pool.closeAll(); }
});
test('aborting infer while opening a new session closes the newly opened runtime', async () => {
  const config: Config = { auth: 'cli', timeout: 5000, strategy: 'permission', system: 'test', blankWarmLimit: 0 };
  const pool = new QoderPool(config);
  let resolveOpen!: (record: unknown) => void;
  let warmClosed = false;
  const fakeRecord = {
    id: 'late-open', messages: [], touched: Date.now(), locked: Promise.resolve(),
    lastCredits: null, model: 'dfmodel', busy: 0, toolSignature: null, retryHint: null, retryMessageHash: null,
    policyCalls: [], closed: false, lastSuccessHash: null, lastDecision: null, sdkSessionId: null,
    lastPromptTokens: null, lastFailedDecision: null, lastCompletionId: null, policy: { reasoning: null },
    controller: new AbortController(), warm: { close() { warmClosed = true; } },
    queue: { push() {}, close() {} }, q: { next: async () => ({ done: true, value: undefined }) },
  };
  (pool as unknown as { open: () => Promise<unknown> }).open = () => new Promise(resolve => { resolveOpen = resolve; });
  try {
    const abortController = new AbortController();
    const pending = pool.infer(request, { signal: abortController.signal });
    abortController.abort(new Error('client disconnected'));
    await assert.rejects(pending, /client disconnected/);
    resolveOpen(fakeRecord);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(fakeRecord.closed, true);
    assert.equal(warmClosed, true);
    assert.equal(pool.stats().sessions, 0);
  } finally { pool.closeAll(); }
});
