import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDisplayDate,
  getNowMinutes,
  getSlotEnd,
  getSlotStart,
  getTodayString,
  isSunday,
  isValidCalendarDate,
} from '../utils/appointmentTime.js';
import { getSlotEndLabel, getSlotRangeLabel } from '../config/appointmentConfig.js';

describe('clinic date and time handling (Asia/Kolkata, UTC+05:30)', () => {
  test('the clinic date rolls over at 18:30 UTC, not at UTC midnight', () => {
    assert.equal(getTodayString(new Date('2026-10-05T18:29:59Z')), '2026-10-05');
    assert.equal(getTodayString(new Date('2026-10-05T18:30:00Z')), '2026-10-06');
    assert.equal(getTodayString(new Date('2026-12-31T20:00:00Z')), '2027-01-01');
  });

  test('minutes since midnight follow IST across the UTC date boundary', () => {
    assert.equal(getNowMinutes(new Date('2026-10-05T18:30:00Z')), 0);
    assert.equal(getNowMinutes(new Date('2026-10-05T04:30:00Z')), 10 * 60);
    assert.equal(getNowMinutes(new Date('2026-10-05T18:29:00Z')), 23 * 60 + 59);
  });

  test('slot start is the IST wall time converted to the correct UTC instant', () => {
    assert.equal(getSlotStart('2026-10-07', '10:00 AM').toISOString(), '2026-10-07T04:30:00.000Z');
    assert.equal(getSlotStart('2026-10-07', '12:00 PM').toISOString(), '2026-10-07T06:30:00.000Z');
    assert.equal(getSlotStart('2026-10-07', '12:30 PM').toISOString(), '2026-10-07T07:00:00.000Z');
    assert.equal(getSlotStart('2026-10-07', '02:00 PM').toISOString(), '2026-10-07T08:30:00.000Z');
    assert.equal(getSlotStart('2026-10-07', '06:30 PM').toISOString(), '2026-10-07T13:00:00.000Z');
  });

  test('slot end adds the configured duration', () => {
    assert.equal(getSlotEnd('2026-10-07', '12:30 PM', 30).toISOString(), '2026-10-07T07:30:00.000Z');
  });

  test('slots sort chronologically by their stored instant, not alphabetically', () => {
    const slots = ['02:00 PM', '10:00 AM', '12:30 PM', '06:30 PM', '11:30 AM'];
    const sorted = [...slots].sort((a, b) => getSlotStart('2026-10-07', a) - getSlotStart('2026-10-07', b));
    assert.deepEqual(sorted, ['10:00 AM', '11:30 AM', '12:30 PM', '02:00 PM', '06:30 PM']);
  });

  test('end labels cross noon correctly and the range label names the time zone', () => {
    assert.equal(getSlotEndLabel('11:30 AM'), '12:00 PM');
    assert.equal(getSlotEndLabel('12:30 PM'), '01:00 PM');
    assert.equal(getSlotRangeLabel('06:30 PM'), '06:30 PM - 07:00 PM IST');
  });

  test('weekday is evaluated in IST so a Saturday-evening UTC date is not misread', () => {
    assert.equal(isSunday('2026-10-04'), true);
    assert.equal(isSunday('2026-10-05'), false);
    assert.equal(isSunday('2026-10-03'), false);
  });

  test('calendar dates are validated strictly', () => {
    assert.equal(isValidCalendarDate('2028-02-29'), true);
    assert.equal(isValidCalendarDate('2027-02-29'), false);
    assert.equal(isValidCalendarDate('2026-13-01'), false);
    assert.equal(isValidCalendarDate('2026-1-1'), false);
  });

  test('display date is stable regardless of the server time zone', () => {
    assert.match(formatDisplayDate('2026-10-07'), /Wed.*07.*Oct.*2026/);
  });
});
