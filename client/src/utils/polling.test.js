import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createPoller } from './polling.js';

function makeEnv() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  const doc = new EventTarget();
  const win = new EventTarget();
  doc.visibilityState = 'visible';
  win.navigator = { onLine: true };

  const flush = async () => {
    for (let index = 0; index < 5; index += 1) await new Promise((resolve) => setImmediate(resolve));
  };

  return {
    doc,
    win,
    flush,
    pending: () => timers.size,
    pendingDelays: () => [...timers.values()].map((timer) => timer.at - now),
    env: {
      setTimeout(fn, ms) {
        const id = nextId++;
        timers.set(id, { fn, at: now + ms });
        return id;
      },
      clearTimeout(id) {
        timers.delete(id);
      },
      now: () => now,
      random: () => 0.5,
      doc,
      win,
    },
    async advance(ms) {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at;
        timers.delete(due[0]);
        due[1].fn();
        await flush();
      }
      now = target;
      await flush();
    },
    setVisible(visible) {
      doc.visibilityState = visible ? 'visible' : 'hidden';
      doc.dispatchEvent(new Event('visibilitychange'));
    },
    setOnline(online) {
      win.navigator.onLine = online;
      win.dispatchEvent(new Event(online ? 'online' : 'offline'));
    },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('poller scheduling', () => {
  test('runs once immediately and then on every interval', async () => {
    const harness = makeEnv();
    let calls = 0;
    const poller = createPoller({ task: async () => { calls += 1; }, intervalMs: 1000, env: harness.env });
    poller.start();
    await harness.flush();
    assert.equal(calls, 1);
    await harness.advance(1000);
    assert.equal(calls, 2);
    await harness.advance(3000);
    assert.equal(calls, 5);
    poller.stop();
  });

  test('can wait one interval before the first run', async () => {
    const harness = makeEnv();
    let calls = 0;
    const poller = createPoller({ task: async () => { calls += 1; }, intervalMs: 1000, env: harness.env });
    poller.start({ immediate: false });
    await harness.flush();
    assert.equal(calls, 0);
    await harness.advance(1000);
    assert.equal(calls, 1);
    poller.stop();
  });

  test('never runs two requests at once, even if the interval elapses and refresh is forced', async () => {
    const harness = makeEnv();
    const gate = deferred();
    let calls = 0;
    const poller = createPoller({
      task: async () => {
        calls += 1;
        await gate.promise;
      },
      intervalMs: 1000,
      env: harness.env,
    });
    poller.start();
    await harness.flush();
    await harness.advance(10000);
    harness.setVisible(false);
    harness.setVisible(true);
    const first = poller.trigger();
    const second = poller.trigger();
    assert.equal(first, second);
    assert.equal(calls, 1);
    assert.equal(poller.isRunning(), true);
    gate.resolve();
    await harness.flush();
    assert.equal(poller.isRunning(), false);
    assert.equal(harness.pending(), 1);
    poller.stop();
  });

  test('the next run is scheduled only after the previous one finishes', async () => {
    const harness = makeEnv();
    const gate = deferred();
    const poller = createPoller({ task: () => gate.promise, intervalMs: 1000, env: harness.env });
    poller.start();
    await harness.flush();
    assert.equal(harness.pending(), 0);
    gate.resolve();
    await harness.flush();
    assert.deepEqual(harness.pendingDelays(), [1000]);
    poller.stop();
  });

  test('jitter stays within the configured ratio', async () => {
    const harness = makeEnv();
    harness.env.random = () => 1;
    const poller = createPoller({ task: async () => {}, intervalMs: 1000, jitterRatio: 0.1, env: harness.env });
    poller.start();
    await harness.flush();
    assert.deepEqual(harness.pendingDelays(), [1100]);
    poller.stop();
  });
});

describe('poller failure handling', () => {
  test('backs off exponentially from the error interval, caps it, and resets after a success', async () => {
    const harness = makeEnv();
    let fail = true;
    const errors = [];
    const poller = createPoller({
      task: async () => {
        if (fail) throw new Error('down');
      },
      intervalMs: 10000,
      errorIntervalMs: 1000,
      maxBackoffMs: 5000,
      onError: (error, info) => errors.push(info.failures),
      env: harness.env,
    });
    poller.start();
    await harness.flush();
    const delays = [];
    for (let index = 0; index < 5; index += 1) {
      delays.push(harness.pendingDelays()[0]);
      await harness.advance(harness.pendingDelays()[0]);
    }
    assert.deepEqual(delays, [1000, 2000, 4000, 5000, 5000]);
    assert.deepEqual(errors, [1, 2, 3, 4, 5, 6]);

    fail = false;
    await harness.advance(harness.pendingDelays()[0]);
    assert.equal(poller.getFailureCount(), 0);
    assert.deepEqual(harness.pendingDelays(), [10000]);
    poller.stop();
  });

  test('a throwing task never stops the loop', async () => {
    const harness = makeEnv();
    let calls = 0;
    const poller = createPoller({
      task: async () => {
        calls += 1;
        throw new Error('boom');
      },
      intervalMs: 1000,
      env: harness.env,
    });
    poller.start();
    await harness.flush();
    await harness.advance(1000);
    await harness.advance(2000);
    assert.ok(calls >= 3);
    poller.stop();
  });
});

describe('poller visibility and connectivity', () => {
  test('pauses completely while hidden and refreshes as soon as the tab is visible again', async () => {
    const harness = makeEnv();
    let calls = 0;
    const poller = createPoller({ task: async () => { calls += 1; }, intervalMs: 1000, minGapMs: 5000, env: harness.env });
    poller.start();
    await harness.flush();
    harness.setVisible(false);
    assert.equal(harness.pending(), 0);
    await harness.advance(60000);
    assert.equal(calls, 1);
    harness.setVisible(true);
    await harness.flush();
    assert.equal(calls, 2);
    poller.stop();
  });

  test('a quick tab switch does not trigger a redundant request', async () => {
    const harness = makeEnv();
    let calls = 0;
    const poller = createPoller({ task: async () => { calls += 1; }, intervalMs: 1000, minGapMs: 5000, env: harness.env });
    poller.start();
    await harness.flush();
    await harness.advance(1000);
    harness.setVisible(false);
    harness.setVisible(true);
    await harness.flush();
    assert.equal(calls, 2);
    assert.equal(harness.pending(), 1);
    poller.stop();
  });

  test('window focus refreshes stale data', async () => {
    const harness = makeEnv();
    let calls = 0;
    const poller = createPoller({ task: async () => { calls += 1; }, intervalMs: 60000, minGapMs: 5000, env: harness.env });
    poller.start();
    await harness.flush();
    await harness.advance(10000);
    harness.win.dispatchEvent(new Event('focus'));
    await harness.flush();
    assert.equal(calls, 2);
    poller.stop();
  });

  test('a hidden interval slows polling instead of pausing it', async () => {
    const harness = makeEnv();
    let calls = 0;
    const poller = createPoller({ task: async () => { calls += 1; }, intervalMs: 1000, hiddenIntervalMs: 10000, env: harness.env });
    poller.start();
    await harness.flush();
    harness.setVisible(false);
    assert.deepEqual(harness.pendingDelays(), [10000]);
    await harness.advance(10000);
    assert.equal(calls, 2);
    poller.stop();
  });

  test('stays quiet while offline and recovers immediately, with failures cleared, when back online', async () => {
    const harness = makeEnv();
    let calls = 0;
    let fail = false;
    const poller = createPoller({
      task: async () => {
        calls += 1;
        if (fail) throw new Error('offline');
      },
      intervalMs: 1000,
      env: harness.env,
    });
    poller.start();
    await harness.flush();
    fail = true;
    await harness.advance(1000);
    assert.equal(poller.getFailureCount(), 1);
    harness.setOnline(false);
    assert.equal(harness.pending(), 0);
    await harness.advance(60000);
    assert.equal(calls, 2);
    fail = false;
    harness.setOnline(true);
    await harness.flush();
    assert.equal(calls, 3);
    assert.equal(poller.getFailureCount(), 0);
    poller.stop();
  });
});

describe('poller cleanup', () => {
  test('stop aborts the in-flight request, clears timers and removes every listener', async () => {
    const harness = makeEnv();
    let signal;
    const gate = deferred();
    let calls = 0;
    const poller = createPoller({
      task: (received) => {
        calls += 1;
        signal = received;
        return gate.promise;
      },
      intervalMs: 1000,
      env: harness.env,
    });
    poller.start();
    await harness.flush();
    assert.equal(signal.aborted, false);
    poller.stop();
    assert.equal(signal.aborted, true);
    assert.equal(harness.pending(), 0);
    gate.resolve();
    await harness.flush();
    harness.setVisible(false);
    harness.setVisible(true);
    harness.win.dispatchEvent(new Event('focus'));
    harness.setOnline(true);
    await harness.advance(60000);
    assert.equal(calls, 1);
    assert.equal(harness.pending(), 0);
  });

  test('a response that arrives after stop is ignored, including a late error', async () => {
    const harness = makeEnv();
    const gate = deferred();
    let reported = 0;
    const poller = createPoller({ task: () => gate.promise, intervalMs: 1000, onError: () => { reported += 1; }, env: harness.env });
    poller.start();
    await harness.flush();
    poller.stop();
    gate.reject(new Error('late'));
    await harness.flush();
    assert.equal(reported, 0);
    assert.equal(harness.pending(), 0);
  });

  test('a stopped poller cannot be restarted', async () => {
    const harness = makeEnv();
    let calls = 0;
    const poller = createPoller({ task: async () => { calls += 1; }, intervalMs: 1000, env: harness.env });
    poller.stop();
    poller.start();
    await harness.flush();
    assert.equal(calls, 0);
  });

  test('a zero interval loads once and then neither polls nor listens', async () => {
    const harness = makeEnv();
    let calls = 0;
    const poller = createPoller({ task: async () => { calls += 1; }, intervalMs: 0, env: harness.env });
    poller.start();
    await harness.flush();
    assert.equal(calls, 1);
    assert.equal(harness.pending(), 0);
    harness.setVisible(false);
    harness.setVisible(true);
    harness.setOnline(true);
    await harness.advance(60000);
    assert.equal(calls, 1);
    poller.stop();
  });
});
