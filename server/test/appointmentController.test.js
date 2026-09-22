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

function modelMock({ existing = null, saved = null } = {}) {
  return {
    findOne: () => ({ select: () => ({ lean: async () => existing }) }),
    find: () => ({ select: () => ({ lean: async () => [] }) }),
    create: async () => saved,
    deleteOne: async () => ({ deletedCount: 0 }),
  };
}

describe('appointmentController', () => {
  afterEach(() => mock.reset());

  test('createAppointment: rejects with 409 when the slot is already booked', async () => {
    mock.module('../models/Appointment.js', {
      defaultExport: modelMock({ existing: { _id: 'existing' } }),
    });
    mock.module('../services/razorpayService.js', {
      namedExports: {
        createRazorpayOrder: async () => ({ id: 'order_1', amount: 50000, currency: 'INR' }),
        getRazorpayKeyId: () => 'key_1',
        fetchRazorpayOrder: async () => ({ status: 'created' }),
      },
    });
    mock.module('../models/Payment.js', { defaultExport: { create: async () => ({ _id: 'payment_1' }) } });

    const { createAppointment } = await import(`../controllers/appointmentController.js?t=${Date.now()}-1`);
    const req = {
      body: {
        appointmentDate: '2026-12-01',
        timeSlot: '10:00 AM',
        consultationType: 'offline',
        fullName: 'Asha Verma',
        phoneNumber: '9876543210',
        email: 'asha@example.com',
      },
    };
    const res = makeRes();

    await createAppointment(req, res, () => assert.fail('next should not be called'));
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
  });

  test('createAppointment: rejects with 409 on a duplicate-key race condition', async () => {
    const err = new Error('E11000 duplicate key error');
    err.code = 11000;

    mock.module('../models/Appointment.js', {
      defaultExport: {
        findOne: () => ({ select: () => ({ lean: async () => null }) }),
        find: () => ({ select: () => ({ lean: async () => [] }) }),
        create: async () => { throw err; },
        deleteOne: async () => ({ deletedCount: 0 }),
      },
    });
    mock.module('../services/razorpayService.js', {
      namedExports: {
        createRazorpayOrder: async () => ({ id: 'order_1', amount: 50000, currency: 'INR' }),
        getRazorpayKeyId: () => 'key_1',
        fetchRazorpayOrder: async () => ({ status: 'created' }),
      },
    });
    mock.module('../models/Payment.js', { defaultExport: { create: async () => ({ _id: 'payment_1' }) } });

    const { createAppointment } = await import(`../controllers/appointmentController.js?t=${Date.now()}-2`);
    const req = {
      body: {
        appointmentDate: '2026-12-01',
        timeSlot: '10:00 AM',
        consultationType: 'virtual',
        fullName: 'Asha Verma',
        phoneNumber: '9876543210',
        email: 'asha@example.com',
      },
    };
    const res = makeRes();

    await createAppointment(req, res, () => assert.fail('next should not be called'));
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
  });

  test('createAppointment: creates a pending payment order for a free slot', async () => {
    const saved = {
      _id: 'appt_1',
      appointmentDate: '2026-12-01',
      timeSlot: '10:00 AM',
      consultationType: 'offline',
      fullName: 'Asha Verma',
      phoneNumber: '9876543210',
      email: 'asha@example.com',
      fee: 500,
      currency: 'INR',
      holdExpiresAt: new Date('2026-12-01T00:10:00Z'),
      paymentOrderId: '',
      paymentStatus: 'CREATED',
      save: async () => saved,
    };

    mock.module('../models/Appointment.js', { defaultExport: modelMock({ saved }) });
    mock.module('../services/razorpayService.js', {
      namedExports: {
        createRazorpayOrder: async () => ({ id: 'order_1', amount: 50000, currency: 'INR' }),
        getRazorpayKeyId: () => 'key_1',
        fetchRazorpayOrder: async () => ({ status: 'created' }),
      },
    });
    mock.module('../models/Payment.js', { defaultExport: { create: async () => ({ _id: 'payment_1' }) } });

    const { createAppointment } = await import(`../controllers/appointmentController.js?t=${Date.now()}-3`);
    const req = {
      body: {
        appointmentDate: '2026-12-01',
        timeSlot: '10:00 AM',
        consultationType: 'offline',
        fullName: 'Asha Verma',
        phoneNumber: '9876543210',
        email: 'asha@example.com',
      },
    };
    const res = makeRes();

    await createAppointment(req, res, () => assert.fail('next should not be called'));
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.appointmentId, 'appt_1');
    assert.equal(res.body.data.orderId, 'order_1');
    assert.equal(res.body.data.amount, 50000);
  });

  test('getBookedSlots: returns active booked time slots', async () => {
    mock.module('../models/Appointment.js', {
      defaultExport: {
        find: () => ({
          select: () => ({
            lean: async () => [{ timeSlot: '10:00 AM' }, { timeSlot: '11:30 AM' }],
          }),
        }),
        deleteOne: async () => ({ deletedCount: 0 }),
      },
    });
    mock.module('../services/razorpayService.js', {
      namedExports: {
        createRazorpayOrder: async () => ({ id: 'order_1', amount: 50000, currency: 'INR' }),
        getRazorpayKeyId: () => 'key_1',
        fetchRazorpayOrder: async () => ({ status: 'created' }),
      },
    });

    const { getBookedSlots } = await import(`../controllers/appointmentController.js?t=${Date.now()}-4`);
    const req = { query: { date: '2026-12-01' } };
    const res = makeRes();

    await getBookedSlots(req, res, () => assert.fail('next should not be called'));
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, ['10:00 AM', '11:30 AM']);
  });

  test('createAppointment: uses the per-type fee for the order amount, stored fee, and Payment record', async () => {
    let capturedAppointmentDoc = null;
    let capturedOrderAmount = null;
    let capturedPaymentDoc = null;

    const saved = {
      _id: 'appt_virtual_1',
      appointmentDate: '2026-12-01',
      timeSlot: '10:00 AM',
      consultationType: 'virtual',
      fullName: 'Asha Verma',
      phoneNumber: '9876543210',
      email: 'asha@example.com',
      fee: 700,
      currency: 'INR',
      holdExpiresAt: new Date('2026-12-01T00:10:00Z'),
      paymentOrderId: '',
      paymentStatus: 'CREATED',
      save: async () => saved,
    };

    mock.module('../models/Appointment.js', {
      defaultExport: {
        findOne: () => ({ select: () => ({ lean: async () => null }) }),
        find: () => ({ select: () => ({ lean: async () => [] }) }),
        create: async (doc) => { capturedAppointmentDoc = doc; return saved; },
        deleteOne: async () => ({ deletedCount: 0 }),
      },
    });
    mock.module('../config/appointmentConfig.js', {
      namedExports: {
        PAYMENT_HOLD_MINUTES: 10,
        getConsultationFee: (type) => (type === 'virtual' ? 700 : 500),
      },
    });
    mock.module('../services/razorpayService.js', {
      namedExports: {
        createRazorpayOrder: async ({ amount }) => {
          capturedOrderAmount = amount;
          return { id: 'order_virtual_1', amount: amount * 100, currency: 'INR' };
        },
        getRazorpayKeyId: () => 'key_1',
        fetchRazorpayOrder: async () => ({ status: 'created' }),
      },
    });
    mock.module('../models/Payment.js', {
      defaultExport: {
        create: async (doc) => { capturedPaymentDoc = doc; return { _id: 'payment_virtual_1' }; },
      },
    });

    const { createAppointment } = await import(`../controllers/appointmentController.js?t=${Date.now()}-5`);
    const req = {
      body: {
        appointmentDate: '2026-12-01',
        timeSlot: '10:00 AM',
        consultationType: 'virtual',
        fullName: 'Asha Verma',
        phoneNumber: '9876543210',
        email: 'asha@example.com',
      },
    };
    const res = makeRes();

    await createAppointment(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 201);
    assert.equal(capturedAppointmentDoc.fee, 700);
    assert.equal(capturedOrderAmount, 700);
    assert.equal(capturedPaymentDoc.amount, 700);
    assert.equal(res.body.data.amount, 70000);
  });
});
