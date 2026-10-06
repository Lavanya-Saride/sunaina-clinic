import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALERT_COOLDOWN_MS,
  ALERT_FAILURE_THRESHOLD,
  recordProviderFailure,
  recordProviderSuccess,
  resetAlertState,
} from '../utils/alerts.js';

describe('bounded failure alerts', () => {
  let lines;

  beforeEach(() => {
    resetAlertState();
    lines = [];
    mock.method(console, 'error', (line) => lines.push(JSON.parse(line)));
  });

  afterEach(() => mock.restoreAll());

  test('nothing is raised until the failure threshold is reached', () => {
    for (let index = 1; index < ALERT_FAILURE_THRESHOLD; index += 1) {
      assert.equal(recordProviderFailure('gmail', {}, 1000), false);
    }
    assert.equal(lines.length, 0);
    assert.equal(recordProviderFailure('gmail', {}, 1000), true);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].level, 'alert');
    assert.equal(lines[0].provider, 'gmail');
  });

  test('a flood of failures raises one alert per cooldown window', () => {
    let raised = 0;
    for (let index = 0; index < 50; index += 1) {
      if (recordProviderFailure('whatsapp', {}, 5000 + index)) raised += 1;
    }
    assert.equal(raised, 1);
    assert.equal(recordProviderFailure('whatsapp', {}, 5002 + ALERT_COOLDOWN_MS - 1), false);
    assert.equal(recordProviderFailure('whatsapp', {}, 5002 + ALERT_COOLDOWN_MS), true);
  });

  test('a success resets the consecutive count', () => {
    recordProviderFailure('calendar', {}, 1);
    recordProviderFailure('calendar', {}, 2);
    recordProviderSuccess('calendar');
    assert.equal(recordProviderFailure('calendar', {}, 3), false);
    assert.equal(lines.length, 0);
  });

  test('providers are tracked independently', () => {
    for (let index = 0; index < ALERT_FAILURE_THRESHOLD; index += 1) recordProviderFailure('gmail', {}, 1);
    assert.equal(recordProviderFailure('calendar', {}, 1), false);
  });
});
