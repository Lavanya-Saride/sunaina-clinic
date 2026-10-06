const DEFAULT_MAX_BACKOFF_MS = 5 * 60 * 1000;
const DEFAULT_MIN_GAP_MS = 5000;
const DEFAULT_JITTER_RATIO = 0.1;

function defaultEnv() {
  return {
    setTimeout: (...args) => globalThis.setTimeout(...args),
    clearTimeout: (...args) => globalThis.clearTimeout(...args),
    now: () => Date.now(),
    random: () => Math.random(),
    doc: globalThis.document ?? null,
    win: globalThis.window ?? null,
  };
}

export function createPoller({
  task,
  intervalMs,
  errorIntervalMs,
  hiddenIntervalMs = null,
  maxBackoffMs = DEFAULT_MAX_BACKOFF_MS,
  minGapMs = DEFAULT_MIN_GAP_MS,
  jitterRatio = DEFAULT_JITTER_RATIO,
  onError,
  env = defaultEnv(),
}) {
  const enabled = Number(intervalMs) > 0;
  let timer = null;
  let controller = null;
  let inFlight = null;
  let failures = 0;
  let lastStartedAt = -Infinity;
  let stopped = false;
  let listening = false;

  const isHidden = () => env.doc?.visibilityState === 'hidden';
  const isOffline = () => env.win?.navigator?.onLine === false;

  function clearTimer() {
    if (timer !== null) {
      env.clearTimeout(timer);
      timer = null;
    }
  }

  function nextDelay() {
    const hidden = isHidden();
    const base = hidden ? hiddenIntervalMs : intervalMs;

    if (base == null || !(base > 0)) return null;

    let delay = base;

    if (failures > 0) {
      const start = errorIntervalMs > 0 ? errorIntervalMs : base;
      delay = Math.min(start * 2 ** (failures - 1), maxBackoffMs);
    }

    const jitter = (env.random() * 2 - 1) * jitterRatio * delay;
    return Math.max(Math.round(delay + jitter), 0);
  }

  function schedule() {
    clearTimer();

    if (stopped || !enabled || isOffline()) return;

    const delay = nextDelay();

    if (delay === null) return;

    timer = env.setTimeout(() => {
      timer = null;
      run();
    }, delay);
  }

  function run() {
    if (stopped) return Promise.resolve();
    if (inFlight) return inFlight;

    clearTimer();
    const mine = new AbortController();
    controller = mine;
    lastStartedAt = env.now();

    inFlight = (async () => {
      try {
        await task(mine.signal);

        if (!mine.signal.aborted) failures = 0;
      } catch (error) {
        if (mine.signal.aborted || stopped) return;

        failures += 1;
        onError?.(error, { failures });
      }
    })().finally(() => {
      if (controller === mine) controller = null;
      inFlight = null;
      schedule();
    });

    return inFlight;
  }

  function refreshIfStale() {
    if (stopped || !enabled || isOffline()) return;

    if (env.now() - lastStartedAt >= minGapMs) {
      run();
    } else if (!inFlight) {
      schedule();
    }
  }

  function onVisibilityChange() {
    if (isHidden()) {
      schedule();
    } else {
      refreshIfStale();
    }
  }

  function onOnline() {
    if (stopped || !enabled) return;
    failures = 0;
    run();
  }

  function onOffline() {
    clearTimer();
  }

  function addListeners() {
    if (listening || !enabled) return;
    listening = true;
    env.doc?.addEventListener('visibilitychange', onVisibilityChange);
    env.win?.addEventListener('focus', refreshIfStale);
    env.win?.addEventListener('online', onOnline);
    env.win?.addEventListener('offline', onOffline);
  }

  function removeListeners() {
    if (!listening) return;
    listening = false;
    env.doc?.removeEventListener('visibilitychange', onVisibilityChange);
    env.win?.removeEventListener('focus', refreshIfStale);
    env.win?.removeEventListener('online', onOnline);
    env.win?.removeEventListener('offline', onOffline);
  }

  return {
    start({ immediate = true } = {}) {
      if (stopped) return;
      addListeners();

      if (immediate) {
        run();
      } else {
        schedule();
      }
    },
    trigger() {
      return run();
    },
    stop() {
      stopped = true;
      clearTimer();
      removeListeners();
      controller?.abort();
      controller = null;
    },
    isRunning() {
      return inFlight !== null;
    },
    getFailureCount() {
      return failures;
    },
  };
}
