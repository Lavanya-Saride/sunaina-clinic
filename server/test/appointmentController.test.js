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

describe('appointmentController', () => {
  afterEach(() => {
    mock.reset();
  });

  test('createAppointment: rejects with 409 when the slot is already booked (pre-check path)', async () => {
    mock.module('../models/Appointment.js', {
      defaultExport: {
        findOne: () => ({
          select: () => ({
            lean: async () => ({ _id: 'existing' }),
          }),
        }),
        create: async () => {
          assert.fail('create() should never be called when the slot is already taken');
        },
      },
    });

    const { createAppointment } = await import(
      `../controllers/appointmentController.js?t=${Date.now()}-1`
    );

    const req = {
      body: {
        appointmentDate: '2026-12-01',
        timeSlot: '10:00 AM',
        fullName: 'Asha Verma',
        phoneNumber: '9876543210',
        email: '',
      },
    };
    const res = makeRes();

    await createAppointment(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
  });

  test('createAppointment: rejects with 409 on a duplicate-key race condition (unique index catches a concurrent booking)', async () => {
    mock.module('../models/Appointment.js', {
      defaultExport: {
        findOne: () => ({
          select: () => ({
            lean: async () => null, // no conflict seen at pre-check time
          }),
        }),
        create: async () => {
          const err = new Error('E11000 duplicate key error');
          err.code = 11000;
          throw err;
        },
      },
    });

    const { createAppointment } = await import(
      `../controllers/appointmentController.js?t=${Date.now()}-2`
    );

    const req = {
      body: {
        appointmentDate: '2026-12-01',
        timeSlot: '10:00 AM',
        fullName: 'Asha Verma',
        phoneNumber: '9876543210',
        email: '',
      },
    };
    const res = makeRes();

    await createAppointment(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
  });

  test('createAppointment: succeeds with 201 for a free slot', async () => {
    const saved = {
      _id: 'appt_1',
      appointmentDate: '2026-12-01',
      timeSlot: '10:00 AM',
      fullName: 'Asha Verma',
      phoneNumber: '9876543210',
      email: '',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    mock.module('../models/Appointment.js', {
      defaultExport: {
        findOne: () => ({ select: () => ({ lean: async () => null }) }),
        create: async () => saved,
      },
    });

    const { createAppointment } = await import(
      `../controllers/appointmentController.js?t=${Date.now()}-3`
    );

    const req = {
      body: {
        appointmentDate: '2026-12-01',
        timeSlot: '10:00 AM',
        fullName: 'Asha Verma',
        phoneNumber: '9876543210',
        email: '',
      },
    };
    const res = makeRes();

    await createAppointment(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.id, 'appt_1');
  });

  test('getBookedSlots: returns just the array of booked time slots for the date', async () => {
    mock.module('../models/Appointment.js', {
      defaultExport: {
        find: () => ({
          select: () => ({
            lean: async () => [{ timeSlot: '10:00 AM' }, { timeSlot: '11:30 AM' }],
          }),
        }),
      },
    });

    const { getBookedSlots } = await import(
      `../controllers/appointmentController.js?t=${Date.now()}-4`
    );

    const req = { query: { date: '2026-12-01' } };
    const res = makeRes();

    await getBookedSlots(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, ['10:00 AM', '11:30 AM']);
  });
});
