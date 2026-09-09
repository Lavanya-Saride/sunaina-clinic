import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePlainText } from '../utils/sanitize.js';

describe('sanitizePlainText', () => {
  test('strips HTML tags', () => {
    assert.equal(
      sanitizePlainText('<script>alert(1)</script>Hello'),
      'alert(1)Hello'
    );
  });

  test('strips control characters', () => {
    assert.equal(sanitizePlainText('Hello\u0000World'), 'HelloWorld');
  });

  test('collapses whitespace and trims', () => {
    assert.equal(sanitizePlainText('  Hello   World  '), 'Hello World');
  });

  test('returns empty string for non-string input', () => {
    assert.equal(sanitizePlainText(undefined), '');
    assert.equal(sanitizePlainText(null), '');
    assert.equal(sanitizePlainText(42), '');
  });

  test('leaves normal text untouched', () => {
    assert.equal(
      sanitizePlainText('Dr. Priyanka Singh, MS (Obs & Gyn)'),
      'Dr. Priyanka Singh, MS (Obs & Gyn)'
    );
  });
});
