import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { canRetryAutomation, hasFailedAutomation, isAwaitingAttendance } from './dashboard.js';

const base = { status: 'CONFIRMED', calendarStatus: 'READY', meetingStatus: 'READY', notifications: { patientEmail: 'SENT', patientWhatsapp: 'SKIPPED' } };

describe('dashboard retry visibility', () => {
  test('confirmed and completed visits offer retry only when a step failed', () => {
    assert.equal(canRetryAutomation(base), false);
    assert.equal(canRetryAutomation({ ...base, notifications: { patientEmail: 'FAILED' } }), true);
    assert.equal(canRetryAutomation({ ...base, status: 'COMPLETED', notifications: { feedbackEmail: 'FAILED' } }), true);
    assert.equal(canRetryAutomation({ ...base, calendarStatus: 'FAILED' }), true);
  });

  test('a cancelled visit offers retry only when removing the calendar event failed', () => {
    assert.equal(canRetryAutomation({ ...base, status: 'CANCELLED', calendarStatus: 'FAILED' }), true);
    assert.equal(canRetryAutomation({ ...base, status: 'CANCELLED', calendarStatus: 'CANCELLED' }), false);
    assert.equal(canRetryAutomation({ ...base, status: 'CANCELLED', notifications: { patientEmail: 'FAILED' } }), false);
  });

  test('pending and absent visits never offer retry', () => {
    assert.equal(canRetryAutomation({ ...base, status: 'PENDING_PAYMENT', calendarStatus: 'FAILED' }), false);
    assert.equal(canRetryAutomation({ ...base, status: 'ABSENT', calendarStatus: 'FAILED' }), false);
  });

  test('failure detection covers notifications, calendar and meeting status', () => {
    assert.equal(hasFailedAutomation({ ...base, meetingStatus: 'FAILED' }), true);
    assert.equal(hasFailedAutomation(base), false);
  });

  test('awaiting attendance starts thirty minutes after the slot', () => {
    const startsAt = '2026-10-07T04:30:00.000Z';
    const start = Date.parse(startsAt);
    assert.equal(isAwaitingAttendance({ status: 'CONFIRMED', startsAt }, start + 29 * 60000), false);
    assert.equal(isAwaitingAttendance({ status: 'CONFIRMED', startsAt }, start + 31 * 60000), true);
    assert.equal(isAwaitingAttendance({ status: 'COMPLETED', startsAt }, start + 99 * 60000), false);
  });
});
