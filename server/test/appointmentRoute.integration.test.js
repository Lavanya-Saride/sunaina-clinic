import { test, describe, mock, before } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';

let app;

before(async () => {
  mock.module('../services/appointmentService.js', {
    namedExports: {
      releaseExpiredHolds: async () => ({}),
      getUnavailableSlots: async () => [],
      createAppointmentRecord: async (input) => ({
        _id: 'appt_1',
        appointmentNumber: 'SC20991201ABC123',
        appointmentDate: input.appointmentDate,
        timeSlot: input.timeSlot,
        consultationType: input.consultationType,
        status: 'PENDING_PAYMENT',
        fee: 500,
        currency: 'INR',
        holdExpiresAt: new Date(),
      }),
    },
  });

  const { default: appointmentRoutes } = await import(
    `../routes/appointmentRoutes.js?t=${Date.now()}`
  );

  app = express();
  app.use(express.json());
  app.use('/api/appointment', appointmentRoutes);
});

const validBody = {
  appointmentDate: '2099-12-01',
  timeSlot: '10:00 AM',
  fullName: 'Asha Verma',
  phoneNumber: '9876543210',
  consultationType: 'offline',
  email: 'asha@example.com',
};

describe('GET /api/appointment/booked-slots', () => {
  test('missing date query param is rejected with 400', async () => {
    const res = await request(app).get('/api/appointment/booked-slots');
    assert.equal(res.status, 400);
  });

  test('valid date returns 200 with an array', async () => {
    const res = await request(app).get(
      '/api/appointment/booked-slots?date=2099-12-01'
    );
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, []);
  });
});

describe('POST /api/appointment validation', () => {
  test('valid payload creates a pending-payment request with 201', async () => {
    const res = await request(app).post('/api/appointment').send(validBody);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'PENDING_PAYMENT');
    assert.equal(res.body.data.orderId, undefined);
    assert.equal(res.body.data.keyId, undefined);
  });

  test('accepts an explicit WhatsApp consent flag', async () => {
    const res = await request(app)
      .post('/api/appointment')
      .send({ ...validBody, whatsappOptIn: true });
    assert.equal(res.status, 201);
  });

  test('rejects a non-boolean WhatsApp consent flag', async () => {
    const res = await request(app)
      .post('/api/appointment')
      .send({ ...validBody, whatsappOptIn: 'yes' });
    assert.equal(res.status, 400);
  });

  test('past date is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/appointment')
      .send({ ...validBody, appointmentDate: '2020-01-01' });

    assert.equal(res.status, 400);
  });

  test('invalid time slot is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/appointment')
      .send({ ...validBody, timeSlot: '3:00 AM' });

    assert.equal(res.status, 400);
  });

  test('invalid phone number is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/appointment')
      .send({ ...validBody, phoneNumber: '12345' });

    assert.equal(res.status, 400);
  });

  test('invalid email is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/appointment')
      .send({ ...validBody, email: 'not-an-email' });

    assert.equal(res.status, 400);
  });

  test('unknown fields are rejected with 400', async () => {
    const res = await request(app)
      .post('/api/appointment')
      .send({ ...validBody, discountCode: 'FREE' });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /discountCode/);
  });

  test('missing required fields are rejected with 400', async () => {
    const res = await request(app).post('/api/appointment').send({});
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.length > 0);
  });
});
