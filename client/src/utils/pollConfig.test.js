import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readIntervalMs } from './pollConfig.js';

const options = { fallback: 60000, min: 15000 };

describe('interval configuration', () => {
  test('uses the default when unset or blank', () => {
    assert.equal(readIntervalMs(undefined, options), 60000);
    assert.equal(readIntervalMs('', options), 60000);
    assert.equal(readIntervalMs('   ', options), 60000);
  });

  test('accepts valid values in milliseconds and enforces the minimum', () => {
    assert.equal(readIntervalMs('45000', options), 45000);
    assert.equal(readIntervalMs('1000', options), 15000);
    assert.equal(readIntervalMs('20000.4', options), 20000);
  });

  test('zero or "off" disables polling', () => {
    assert.equal(readIntervalMs('0', options), 0);
    assert.equal(readIntervalMs('off', options), 0);
    assert.equal(readIntervalMs('OFF', options), 0);
  });

  test('ignores garbage and negative values', () => {
    assert.equal(readIntervalMs('abc', options), 60000);
    assert.equal(readIntervalMs('-5', options), 60000);
    assert.equal(readIntervalMs('Infinity', options), 60000);
  });
});
