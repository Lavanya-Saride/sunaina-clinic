import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = { ...process.env };

function setWhatsAppEnv(overrides = {}) {
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone_id_1';
  process.env.WHATSAPP_ACCESS_TOKEN = 'token_1';
  process.env.WHATSAPP_CLINIC_NUMBER = '9876500000';
  Object.assign(process.env, overrides);
}

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
}

function makeAppointment(overrides = {}) {
  return {
    appointmentNumber: 'SC20261201ABCDEF',
    appointmentDate: '2026-12-01',
    timeSlot: '10:00 AM',
    consultationType: 'offline',
    fullName: 'Asha Verma',
    phoneNumber: '9876543210',
    email: 'asha@example.com',
    fee: 500,
    meetUrl: '',
    ...overrides,
  };
}

describe('whatsappService', () => {
  afterEach(() => {
    restoreEnv();
    mock.reset();
  });

  test('throws when WhatsApp credentials are not configured', async () => {
    setWhatsAppEnv({ WHATSAPP_PHONE_NUMBER_ID: '', WHATSAPP_ACCESS_TOKEN: '' });

    const { sendPatientAppointmentWhatsApp } = await import(
      `../services/whatsappService.js?t=${Date.now()}-1`
    );

    await assert.rejects(
      () => sendPatientAppointmentWhatsApp(makeAppointment()),
      /WhatsApp credentials are not fully configured/
    );
  });

  test('sends a clinic-consultation message to the patient with directions, normalizing a 10-digit number', async () => {
    setWhatsAppEnv();

    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ messages: [{ id: 'wamid.1' }] }),
      };
    });

    const { sendPatientAppointmentWhatsApp } = await import(
      `../services/whatsappService.js?t=${Date.now()}-2`
    );

    await sendPatientAppointmentWhatsApp(makeAppointment());

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://graph.facebook.com/v20.0/phone_id_1/messages');
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.to, '919876543210');
    assert.match(body.text.body, /SC20261201ABCDEF/);
    assert.match(body.text.body, /Clinic Consultation/);
    assert.match(body.text.body, /google\.com\/maps/);
    assert.doesNotMatch(body.text.body, /Google Meet/);
  });

  test('sends a virtual-consultation message to the clinic including the Meet link', async () => {
    setWhatsAppEnv();

    const calls = [];
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ messages: [{ id: 'wamid.2' }] }),
      };
    });

    const { sendClinicAppointmentWhatsApp } = await import(
      `../services/whatsappService.js?t=${Date.now()}-3`
    );

    await sendClinicAppointmentWhatsApp(
      makeAppointment({ consultationType: 'virtual', meetUrl: 'https://meet.google.com/abc-defg-hij' })
    );

    assert.equal(calls.length, 1);
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.to, '919876500000');
    assert.match(body.text.body, /Virtual Consultation/);
    assert.match(body.text.body, /meet\.google\.com/);
  });

  test('throws when the provider responds with an error', async () => {
    setWhatsAppEnv();

    mock.method(globalThis, 'fetch', async () => ({
      ok: false,
      json: async () => ({ error: { message: 'Invalid recipient' } }),
    }));

    const { sendPatientAppointmentWhatsApp } = await import(
      `../services/whatsappService.js?t=${Date.now()}-4`
    );

    await assert.rejects(
      () => sendPatientAppointmentWhatsApp(makeAppointment()),
      /Invalid recipient/
    );
  });

  test('returns null for the clinic message when WHATSAPP_CLINIC_NUMBER is not set', async () => {
    setWhatsAppEnv({ WHATSAPP_CLINIC_NUMBER: '' });

    let called = false;
    mock.method(globalThis, 'fetch', async () => {
      called = true;
      return { ok: true, json: async () => ({}) };
    });

    const { sendClinicAppointmentWhatsApp } = await import(
      `../services/whatsappService.js?t=${Date.now()}-5`
    );

    const result = await sendClinicAppointmentWhatsApp(makeAppointment());
    assert.equal(result, null);
    assert.equal(called, false);
  });
});
