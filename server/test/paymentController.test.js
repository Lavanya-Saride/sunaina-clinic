import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function makeAppointment(overrides = {}) {
  const appointment = {
    _id: 'appt_1',
    appointmentNumber: 'SC20261201ABCDEF',
    appointmentDate: '2026-12-01',
    timeSlot: '10:00 AM',
    consultationType: 'offline',
    fullName: 'Asha Verma',
    phoneNumber: '9876543210',
    email: 'asha@example.com',
    fee: 500,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    paymentId: '',
    meetUrl: '',
    googleEventId: '',
    meetingStatus: 'PENDING',
    patientEmailStatus: 'PENDING',
    clinicEmailStatus: 'PENDING',
    patientWhatsappStatus: 'PENDING',
    clinicWhatsappStatus: 'PENDING',
    ...overrides,
  };
  appointment.save = async () => appointment;
  return appointment;
}

function makePayment(overrides = {}) {
  const payment = {
    _id: 'pay_1',
    appointmentId: { toString: () => 'appt_1' },
    providerOrderId: 'order_1',
    providerPaymentId: '',
    amount: 500,
    currency: 'INR',
    status: 'CREATED',
    webhookEventIds: [],
    paidAt: null,
    ...overrides,
  };
  payment.save = async () => payment;
  return payment;
}

function mockCommonServices({ meetImpl, emailPatientImpl, emailClinicImpl, whatsappPatientImpl, whatsappClinicImpl } = {}) {
  mock.module('../services/razorpayService.js', {
    namedExports: {
      verifyPaymentSignature: () => true,
      verifyWebhookSignature: () => true,
      fetchRazorpayPayment: async () => ({
        order_id: 'order_1',
        status: 'captured',
        amount: 50000,
        currency: 'INR',
      }),
    },
  });
  mock.module('../services/googleCalendarService.js', {
    namedExports: {
      createVirtualConsultation:
        meetImpl || (async () => ({ id: 'evt_1', hangoutLink: 'https://meet.google.com/abc-defg-hij' })),
      extractMeetUrl: (event) => event?.hangoutLink || '',
    },
  });
  mock.module('../services/emailService.js', {
    namedExports: {
      sendAppointmentConfirmationToPatient: emailPatientImpl || (async () => ({ id: 'email_1' })),
      sendAppointmentConfirmationToClinic: emailClinicImpl || (async () => ({ id: 'email_2' })),
    },
  });
  mock.module('../services/whatsappService.js', {
    namedExports: {
      sendPatientAppointmentWhatsApp: whatsappPatientImpl || (async () => ({ id: 'wa_1' })),
      sendClinicAppointmentWhatsApp: whatsappClinicImpl || (async () => ({ id: 'wa_2' })),
    },
  });
}

describe('paymentController.verifyPayment', () => {
  afterEach(() => mock.reset());

  test('confirms a clinic appointment and sends email + WhatsApp to patient and clinic, without creating a Meet event', async () => {
    const appointment = makeAppointment({ consultationType: 'offline' });
    const payment = makePayment();

    const emailCalls = [];
    const whatsappCalls = [];
    let meetCalled = false;

    mockCommonServices({
      meetImpl: async () => { meetCalled = true; return { id: 'evt', hangoutLink: 'x' }; },
      emailPatientImpl: async (appt) => { emailCalls.push(['patient', appt.consultationType]); return { id: 'e1' }; },
      emailClinicImpl: async (appt) => { emailCalls.push(['clinic', appt.consultationType]); return { id: 'e2' }; },
      whatsappPatientImpl: async (appt) => { whatsappCalls.push(['patient', appt.consultationType]); return { id: 'w1' }; },
      whatsappClinicImpl: async (appt) => { whatsappCalls.push(['clinic', appt.consultationType]); return { id: 'w2' }; },
    });

    mock.module('../models/Payment.js', {
      defaultExport: { findOne: async () => payment },
    });
    mock.module('../models/Appointment.js', {
      defaultExport: { findById: async () => appointment },
    });

    const { verifyPayment } = await import(`../controllers/paymentController.js?t=${Date.now()}-1`);

    const req = {
      body: {
        appointmentId: 'appt_1',
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_xyz',
        razorpay_signature: 'sig',
      },
    };
    const res = makeRes();

    await verifyPayment(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.appointmentNumber, 'SC20261201ABCDEF');
    assert.equal(appointment.status, 'CONFIRMED');
    assert.equal(appointment.paymentStatus, 'PAID');
    assert.equal(appointment.meetingStatus, 'NOT_REQUIRED');
    assert.equal(meetCalled, false);
    assert.equal(appointment.patientEmailStatus, 'SENT');
    assert.equal(appointment.clinicEmailStatus, 'SENT');
    assert.equal(appointment.patientWhatsappStatus, 'SENT');
    assert.equal(appointment.clinicWhatsappStatus, 'SENT');
    assert.deepEqual(emailCalls, [['patient', 'offline'], ['clinic', 'offline']]);
    assert.deepEqual(whatsappCalls, [['patient', 'offline'], ['clinic', 'offline']]);
  });

  test('confirms a virtual appointment, creates a Google Meet, and includes the link in the response', async () => {
    const appointment = makeAppointment({ consultationType: 'virtual', meetingStatus: 'PENDING' });
    const payment = makePayment();

    mockCommonServices();
    mock.module('../models/Payment.js', { defaultExport: { findOne: async () => payment } });
    mock.module('../models/Appointment.js', { defaultExport: { findById: async () => appointment } });

    const { verifyPayment } = await import(`../controllers/paymentController.js?t=${Date.now()}-2`);

    const req = {
      body: {
        appointmentId: 'appt_1',
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_xyz',
        razorpay_signature: 'sig',
      },
    };
    const res = makeRes();

    await verifyPayment(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 200);
    assert.equal(appointment.meetUrl, 'https://meet.google.com/abc-defg-hij');
    assert.equal(appointment.meetingStatus, 'READY');
    assert.equal(res.body.data.meetUrl, 'https://meet.google.com/abc-defg-hij');
  });

  test('a failed Google Meet creation does not fail the request or revert payment/appointment state', async () => {
    const appointment = makeAppointment({ consultationType: 'virtual' });
    const payment = makePayment();

    mockCommonServices({
      meetImpl: async () => { throw new Error('Google Calendar request failed.'); },
    });
    mock.module('../models/Payment.js', { defaultExport: { findOne: async () => payment } });
    mock.module('../models/Appointment.js', { defaultExport: { findById: async () => appointment } });

    const { verifyPayment } = await import(`../controllers/paymentController.js?t=${Date.now()}-3`);

    const req = {
      body: {
        appointmentId: 'appt_1',
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_xyz',
        razorpay_signature: 'sig',
      },
    };
    const res = makeRes();

    await verifyPayment(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 200);
    assert.equal(appointment.status, 'CONFIRMED');
    assert.equal(appointment.paymentStatus, 'PAID');
    assert.equal(appointment.meetingStatus, 'FAILED');
    assert.equal(appointment.meetUrl, '');
    assert.equal(appointment.patientEmailStatus, 'SENT');
    assert.equal(appointment.patientWhatsappStatus, 'SENT');
  });

  test('rejects when the signature is invalid', async () => {
    mock.module('../services/razorpayService.js', {
      namedExports: {
        verifyPaymentSignature: () => false,
        verifyWebhookSignature: () => true,
        fetchRazorpayPayment: async () => ({}),
      },
    });
    mock.module('../services/googleCalendarService.js', {
      namedExports: { createVirtualConsultation: async () => ({}), extractMeetUrl: () => '' },
    });
    mock.module('../services/emailService.js', {
      namedExports: {
        sendAppointmentConfirmationToPatient: async () => ({}),
        sendAppointmentConfirmationToClinic: async () => ({}),
      },
    });
    mock.module('../services/whatsappService.js', {
      namedExports: {
        sendPatientAppointmentWhatsApp: async () => ({}),
        sendClinicAppointmentWhatsApp: async () => ({}),
      },
    });

    const { verifyPayment } = await import(`../controllers/paymentController.js?t=${Date.now()}-4`);
    const req = {
      body: {
        appointmentId: 'appt_1',
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_xyz',
        razorpay_signature: 'bad_sig',
      },
    };
    const res = makeRes();

    await verifyPayment(req, res, () => assert.fail('next should not be called'));
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });
});

describe('paymentController.paymentWebhook', () => {
  afterEach(() => mock.reset());

  test('is idempotent: the same webhook event id is only processed once', async () => {
    const appointment = makeAppointment({ consultationType: 'offline' });
    const payment = makePayment();

    let emailSendCount = 0;
    mockCommonServices({
      emailPatientImpl: async () => { emailSendCount += 1; return { id: 'e1' }; },
    });
    mock.module('../models/Payment.js', { defaultExport: { findOne: async () => payment } });
    mock.module('../models/Appointment.js', { defaultExport: { findById: async () => appointment } });

    const { paymentWebhook } = await import(`../controllers/paymentController.js?t=${Date.now()}-5`);

    const eventBody = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_xyz', order_id: 'order_1' } } },
    };

    const makeReq = () => ({
      get: (header) => (header === 'X-Razorpay-Signature' ? 'sig' : header === 'X-Razorpay-Event-Id' ? 'evt_dup_1' : undefined),
      rawBody: Buffer.from(JSON.stringify(eventBody)),
      body: eventBody,
    });

    const res1 = makeRes();
    await paymentWebhook(makeReq(), res1, () => assert.fail('next should not be called'));
    assert.equal(res1.statusCode, 200);
    assert.equal(appointment.status, 'CONFIRMED');
    assert.equal(emailSendCount, 1);
    assert.equal(payment.webhookEventIds.length, 1);

    const res2 = makeRes();
    await paymentWebhook(makeReq(), res2, () => assert.fail('next should not be called'));
    assert.equal(res2.statusCode, 200);
    assert.equal(payment.webhookEventIds.length, 1);
    assert.equal(emailSendCount, 1);
  });

  test('payment.failed cancels and removes the pending appointment hold', async () => {
    const appointment = makeAppointment({ status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' });
    const payment = makePayment();
    let deletedFilter = null;

    mockCommonServices();
    mock.module('../models/Payment.js', { defaultExport: { findOne: async () => payment } });
    mock.module('../models/Appointment.js', {
      defaultExport: {
        findById: async () => appointment,
        deleteOne: async (filter) => { deletedFilter = filter; return { deletedCount: 1 }; },
      },
    });

    const { paymentWebhook } = await import(`../controllers/paymentController.js?t=${Date.now()}-6`);

    const eventBody = {
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_xyz', order_id: 'order_1' } } },
    };
    const req = {
      get: (header) => (header === 'X-Razorpay-Signature' ? 'sig' : header === 'X-Razorpay-Event-Id' ? 'evt_failed_1' : undefined),
      rawBody: Buffer.from(JSON.stringify(eventBody)),
      body: eventBody,
    };
    const res = makeRes();

    await paymentWebhook(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 200);
    assert.equal(payment.status, 'FAILED');
    assert.equal(appointment.status, 'CANCELLED');
    assert.deepEqual(deletedFilter, { _id: 'appt_1', status: 'CANCELLED' });
  });

  test('does not let a late payment.failed event cancel an already paid appointment', async () => {
    const appointment = makeAppointment({ status: 'CONFIRMED', paymentStatus: 'PAID' });
    const payment = makePayment({ status: 'PAID', providerPaymentId: 'pay_xyz' });

    mockCommonServices();
    mock.module('../models/Payment.js', { defaultExport: { findOne: async () => payment } });
    mock.module('../models/Appointment.js', {
      defaultExport: {
        findById: async () => appointment,
        deleteOne: async () => ({ deletedCount: 0 }),
      },
    });

    const { paymentWebhook } = await import(`../controllers/paymentController.js?t=${Date.now()}-late-failed`);

    const eventBody = {
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_xyz', order_id: 'order_1' } } },
    };
    const req = {
      get: (header) => (header === 'X-Razorpay-Signature' ? 'sig' : header === 'X-Razorpay-Event-Id' ? 'evt_late_failed' : undefined),
      rawBody: Buffer.from(JSON.stringify(eventBody)),
      body: eventBody,
    };
    const res = makeRes();

    await paymentWebhook(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 200);
    assert.equal(payment.status, 'PAID');
    assert.equal(appointment.status, 'CONFIRMED');
    assert.equal(appointment.paymentStatus, 'PAID');
  });

  test('rejects a webhook with an invalid signature', async () => {
    mock.module('../services/razorpayService.js', {
      namedExports: {
        verifyPaymentSignature: () => true,
        verifyWebhookSignature: () => false,
        fetchRazorpayPayment: async () => ({}),
      },
    });

    const { paymentWebhook } = await import(`../controllers/paymentController.js?t=${Date.now()}-7`);
    const req = {
      get: () => 'bad_sig',
      rawBody: Buffer.from('{}'),
      body: {},
    };
    const res = makeRes();

    await paymentWebhook(req, res, () => assert.fail('next should not be called'));
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });
});
