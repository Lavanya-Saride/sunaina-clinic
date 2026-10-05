import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeExternalApis } from './helpers/externalApis.js';
import {
  isWhatsAppConfigured,
  sendClinicAlertWhatsApp,
  sendPatientConfirmationWhatsApp,
  sendPatientFeedbackWhatsApp,
} from '../services/whatsappService.js';

const ORIGINAL_ENV = { ...process.env };
const fake = installFakeExternalApis();

const appointment = {
  appointmentNumber: 'SC20991201ABC123',
  appointmentDate: '2099-12-01',
  timeSlot: '10:00 AM',
  consultationType: 'virtual',
  meetUrl: 'https://meet.google.com/abc-defg-hij',
  fullName: 'Asha Verma',
};

describe('whatsappService (Graph API faked, no real network call)', () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      WHATSAPP_PHONE_NUMBER_ID: '123',
      WHATSAPP_ACCESS_TOKEN: 'token',
      WHATSAPP_CLINIC_NUMBER: '9111111111',
    };
    fake.reset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('reports unconfigured when credentials are missing', () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    assert.equal(isWhatsAppConfigured(), false);
  });

  test('throws when credentials are missing instead of sending', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    await assert.rejects(sendPatientConfirmationWhatsApp(appointment, '9876543210'), /not fully configured/);
  });

  test('sends an approved template (not free text) and normalizes a 10-digit number', async () => {
    await sendPatientConfirmationWhatsApp(appointment, '9876543210');
    assert.equal(fake.state.whatsapp.length, 1);
    assert.equal(fake.state.whatsapp[0].to, '919876543210');
    assert.equal(fake.state.whatsapp[0].template, 'appointment_confirmation');
    assert.ok(fake.state.whatsapp[0].parameters.includes('https://meet.google.com/abc-defg-hij'));
  });

  test('template parameters contain no payment or medical details', async () => {
    await sendPatientConfirmationWhatsApp(appointment, '9876543210');
    const joined = fake.state.whatsapp[0].parameters.join(' ').toLowerCase();
    assert.equal(/payment|rs\.|₹|diagnos|pregnan/.test(joined), false);
  });

  test('feedback request sends the feedback template with the link', async () => {
    await sendPatientFeedbackWhatsApp(appointment, '9876543210', 'https://x.test/feedback');
    assert.equal(fake.state.whatsapp[0].template, 'feedback_request');
    assert.deepEqual(fake.state.whatsapp[0].parameters, ['Asha Verma', 'https://x.test/feedback']);
  });

  test('clinic alert returns null when no clinic number is configured', async () => {
    delete process.env.WHATSAPP_CLINIC_NUMBER;
    assert.equal(await sendClinicAlertWhatsApp(appointment), null);
    assert.equal(fake.state.whatsapp.length, 0);
  });

  test('throws when the provider rejects the message', async () => {
    fake.state.failWhatsApp = true;
    await assert.rejects(sendPatientConfirmationWhatsApp(appointment, '9876543210'), /Template not approved/);
  });
});
