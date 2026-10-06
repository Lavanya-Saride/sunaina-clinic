import { test, describe, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { logEvent, sanitizeLogText } from '../utils/logger.js';

describe('structured logging', () => {
  afterEach(() => mock.restoreAll());

  test('emails and phone numbers are redacted from free text', () => {
    const cleaned = sanitizeLogText('Failed for asha.verma@example.com and +91 98765 43210 and 9876543210');
    assert.equal(cleaned.includes('asha'), false);
    assert.equal(cleaned.includes('9876'), false);
    assert.match(cleaned, /\[email\]/);
    assert.match(cleaned, /\[number\]/);
  });

  test('messages are truncated', () => {
    assert.equal(sanitizeLogText('x'.repeat(1000)).length, 200);
  });

  test('output is one JSON line with only scalar fields, so nested payloads cannot leak', () => {
    const lines = [];
    mock.method(console, 'error', (line) => lines.push(line));
    logEvent('error', 'probe', {
      status: 500,
      message: 'boom for a@b.co',
      body: { phone: '9876543210', story: 'private' },
      list: ['x'],
    });
    assert.equal(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.event, 'probe');
    assert.equal(entry.level, 'error');
    assert.equal(entry.status, 500);
    assert.equal('body' in entry, false);
    assert.equal('list' in entry, false);
    assert.equal(lines[0].includes('9876543210'), false);
    assert.equal(lines[0].includes('private'), false);
    assert.equal(lines[0].includes('a@b.co'), false);
  });
});
