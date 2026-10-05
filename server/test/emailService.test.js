import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeExternalApis } from './helpers/externalApis.js';
import {
  getMailbox,
  sendAppointmentConfirmationToPatient,
  sendCallbackRequest,
} from '../services/emailService.js';
import { clearGoogleTokenCache } from '../services/googleAuth.js';

const ORIGINAL_ENV = { ...process.env };
const fake = installFakeExternalApis();

const appointment = {
  _id: 'appt1',
  appointmentNumber: 'SC20991201ABC123',
  appointmentDate: '2099-12-01',
  timeSlot: '10:00 AM',
  consultationType: 'offline',
  fullName: 'Asha <b>Verma</b>',
  email: 'asha@example.com',
  phoneNumber: '9876543210',
  fee: 500,
};

describe('emailService (Gmail API faked, no real network call)', () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_REFRESH_TOKEN: 'refresh',
    };
    delete process.env.EMAIL_APPOINTMENTS;
    delete process.env.EMAIL_SUPPORT;
    clearGoogleTokenCache();
    fake.reset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('appointment emails are sent from the appointments company mailbox', async () => {
    await sendAppointmentConfirmationToPatient(appointment);
    assert.equal(fake.state.emails.length, 1);
    assert.match(fake.state.emails[0].from, /<appointments@sunaina-clinic\.com>/);
    assert.equal(fake.state.emails[0].to, 'asha@example.com');
    assert.match(fake.state.emails[0].subject, /Appointment Confirmed/);
  });

  test('callback requests are sent from and to the support mailbox', async () => {
    await sendCallbackRequest({ name: 'Asha', phone: '9876543210' });
    assert.match(fake.state.emails[0].from, /<support@sunaina-clinic\.com>/);
    assert.equal(fake.state.emails[0].to, 'support@sunaina-clinic.com');
  });

  test('refuses a mailbox outside the company domain', () => {
    process.env.EMAIL_APPOINTMENTS = 'someone@gmail.com';
    assert.throws(() => getMailbox('appointments'), /sunaina-clinic\.com/);
  });

  test('escapes patient-supplied values in the HTML body', async () => {
    await sendAppointmentConfirmationToPatient({ ...appointment, fullName: '<script>x</script>' });
    assert.equal(fake.state.emails[0].html.includes('<script>'), false);
  });

  test('does not send a patient email when no address is on file', async () => {
    const result = await sendAppointmentConfirmationToPatient({ ...appointment, email: '' });
    assert.equal(result, null);
    assert.equal(fake.state.emails.length, 0);
  });

  test('rejects recipients containing header-injection characters', async () => {
    await assert.rejects(
      sendAppointmentConfirmationToPatient({ ...appointment, email: 'a@b.com\r\nBcc: x@y.com' }),
      /invalid/i
    );
    assert.equal(fake.state.emails.length, 0);
  });

  test('surfaces a Gmail failure instead of reporting success', async () => {
    fake.state.failGmail = true;
    await assert.rejects(sendAppointmentConfirmationToPatient(appointment), /Gmail unavailable/);
  });
});
