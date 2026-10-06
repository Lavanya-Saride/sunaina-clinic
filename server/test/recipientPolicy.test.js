import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { assertRecipientAllowed, isRecipientAllowed, RECIPIENT_NOT_ALLOWED } from '../utils/recipientPolicy.js';

const ORIGINAL = process.env.OUTBOUND_ALLOWED_RECIPIENTS;

describe('outbound recipient allow-list (staging safeguard)', () => {
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.OUTBOUND_ALLOWED_RECIPIENTS;
    else process.env.OUTBOUND_ALLOWED_RECIPIENTS = ORIGINAL;
  });

  test('everything is allowed when the variable is unset or blank, so production behaviour is unchanged', () => {
    delete process.env.OUTBOUND_ALLOWED_RECIPIENTS;
    assert.equal(isRecipientAllowed('anyone@example.com'), true);
    assert.equal(isRecipientAllowed('9876543210'), true);
    process.env.OUTBOUND_ALLOWED_RECIPIENTS = ' , ';
    assert.equal(isRecipientAllowed('anyone@example.com'), true);
  });

  test('exact addresses and whole domains can be listed, case-insensitively', () => {
    process.env.OUTBOUND_ALLOWED_RECIPIENTS = 'Tester@Example.com, @qa.example';
    assert.equal(isRecipientAllowed('tester@example.com'), true);
    assert.equal(isRecipientAllowed('TESTER@EXAMPLE.COM'), true);
    assert.equal(isRecipientAllowed('anyone@qa.example'), true);
    assert.equal(isRecipientAllowed('patient@example.com'), false);
    assert.equal(isRecipientAllowed('x@notqa.example'), false);
    assert.equal(isRecipientAllowed('x@evil-qa.example.com'), false);
  });

  test('phone numbers match however they are written', () => {
    process.env.OUTBOUND_ALLOWED_RECIPIENTS = '98111 11122';
    assert.equal(isRecipientAllowed('9811111122'), true);
    assert.equal(isRecipientAllowed('919811111122'), true);
    assert.equal(isRecipientAllowed('+91 98111-11122'), true);
    assert.equal(isRecipientAllowed('9811111133'), false);
  });

  test('an email entry never authorises a phone number or the reverse, and empty values are refused', () => {
    process.env.OUTBOUND_ALLOWED_RECIPIENTS = 'a@b.example,9811111122';
    assert.equal(isRecipientAllowed(''), false);
    assert.equal(isRecipientAllowed(undefined), false);
    assert.equal(isRecipientAllowed('9811111122@b.example'), false);
  });

  test('the assertion throws a coded error that carries no recipient data', () => {
    process.env.OUTBOUND_ALLOWED_RECIPIENTS = 'tester@example.com';
    assert.throws(
      () => assertRecipientAllowed('real.patient@example.com'),
      (error) => error.code === RECIPIENT_NOT_ALLOWED && !error.message.includes('real.patient')
    );
    assert.doesNotThrow(() => assertRecipientAllowed('tester@example.com'));
  });
});
