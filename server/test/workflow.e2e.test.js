import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import mongoose from 'mongoose';
import { installFakeExternalApis } from './helpers/externalApis.js';

const TEST_URI = process.env.TEST_MONGO_URI;
const skip = !TEST_URI;

process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'id';
process.env.GOOGLE_CLIENT_SECRET = 'secret';
process.env.GOOGLE_REFRESH_TOKEN = 'refresh';
process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
process.env.WHATSAPP_ACCESS_TOKEN = 'token';
process.env.WHATSAPP_CLINIC_NUMBER = '9111111111';
process.env.WHATSAPP_VERIFY_TOKEN = 'verify-me';
process.env.WHATSAPP_APP_SECRET = 'app-secret';
process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = 'waba-1';
process.env.CLIENT_URL = 'http://localhost:5173';

const PASSWORD = 'Str0ngPassw0rdXyz';
const fake = installFakeExternalApis();
const atomicDb = process.env.TEST_DB_ATOMIC === 'true';

let app;
let models;
let agent;
const tokens = {};
let counter = 0;
let ipCounter = 0;

function clientAgent(base) {
  const wrap = (method) => (...args) => {
    ipCounter += 1;
    return base[method](...args).set('X-Forwarded-For', `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`);
  };
  return { get: wrap('get'), post: wrap('post'), options: wrap('options') };
}

function workday(offset) {
  const date = new Date(Date.now() + (offset + 2) * 24 * 60 * 60 * 1000);
  while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function uniqueDate() {
  counter += 1;
  return workday(counter);
}

function phone() {
  counter += 1;
  return `98${String(10000000 + counter).slice(0, 8)}`;
}

const auth = (role) => ({ Authorization: `Bearer ${tokens[role]}` });

function book(overrides = {}) {
  return agent.post('/api/appointment').send({
    appointmentDate: uniqueDate(),
    timeSlot: '10:00 AM',
    consultationType: 'virtual',
    fullName: 'Asha Verma',
    phoneNumber: phone(),
    email: 'asha@example.com',
    whatsappOptIn: true,
    ...overrides,
  });
}

const pay = (id, role = 'CLINICIAN', body = { method: 'UPI', reference: 'UTR123' }) =>
  agent.post(`/api/dashboard/appointments/${id}/confirm-payment`).set(auth(role)).send(body);

const attend = (id, status, role = 'CLINICIAN') =>
  agent.post(`/api/dashboard/appointments/${id}/attendance`).set(auth(role)).send({ status });

const emailsTo = (address) => fake.state.emails.filter((email) => email.to === address);
const dbDoc = (id) => models.Appointment.findById(id).lean();

describe('end-to-end workflows (real database, faked Google/WhatsApp APIs)', { skip }, () => {
  before(async () => {
    assert.ok(/test/i.test(TEST_URI), 'TEST_MONGO_URI must point at a database whose name contains "test".');
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.dropDatabase();

    const { default: Appointment } = await import('../models/Appointment.js');
    const { default: Patient } = await import('../models/Patient.js');
    const { default: User } = await import('../models/User.js');
    const { default: Session } = await import('../models/Session.js');
    const { runMigrations } = await import('../config/migrations.js');
    const { hashPassword } = await import('../utils/password.js');
    models = { Appointment, Patient, User, Session };

    await runMigrations();

    const passwordHash = await hashPassword(PASSWORD);

    for (const role of ['ADMIN', 'CLINICIAN', 'STAFF']) {
      await User.create({ name: `${role} User`, email: `${role.toLowerCase()}@sunaina-clinic.com`, role, passwordHash });
    }
    await User.create({ name: 'Inactive', email: 'inactive@sunaina-clinic.com', role: 'STAFF', passwordHash, active: false });

    ({ default: app } = await import('../server.js'));
    agent = clientAgent(request(app));

    for (const role of ['ADMIN', 'CLINICIAN', 'STAFF']) {
      const res = await agent.post('/api/auth/login').send({ email: `${role.toLowerCase()}@sunaina-clinic.com`, password: PASSWORD });
      assert.equal(res.status, 200);
      tokens[role] = res.body.data.token;
    }
  });

  after(async () => {
    fake.restore();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(() => fake.reset());

  describe('public website needs no authentication', () => {
    test('booked-slots and booking work without any credentials', async () => {
      const date = uniqueDate();
      const slots = await agent.get(`/api/appointment/booked-slots?date=${date}`);
      assert.equal(slots.status, 200);
      const res = await book({ appointmentDate: date });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'PENDING_PAYMENT');
      const stored = await dbDoc(res.body.data.appointmentId);
      assert.equal(stored.status, 'PENDING_PAYMENT');
      assert.equal(stored.paymentStatus, 'PENDING');
      assert.equal(stored.paymentOrderId, '');
      assert.equal(fake.state.emails.length, 0);
      assert.equal(fake.state.events.size, 0);
    });

    test('a pending slot is reserved and a second booking gets 409', async () => {
      const date = uniqueDate();
      assert.equal((await book({ appointmentDate: date })).status, 201);
      const second = await book({ appointmentDate: date, phoneNumber: phone() });
      assert.equal(second.status, 409);
      const slots = await agent.get(`/api/appointment/booked-slots?date=${date}`);
      assert.deepEqual(slots.body.data, ['10:00 AM']);
    });

    test('concurrent bookings of one slot produce exactly one appointment', async () => {
      const date = uniqueDate();
      const results = await Promise.all([1, 2, 3, 4].map(() => book({ appointmentDate: date, phoneNumber: phone() })));
      assert.equal(results.filter((r) => r.status === 201).length, 1);
      assert.equal(results.filter((r) => r.status === 409).length, 3);
      assert.equal(await models.Appointment.countDocuments({ appointmentDate: date }), 1);
    });

    test('rejects Sundays, past dates and unknown fields', async () => {
      const sunday = new Date(Date.now() + 14 * 86400000);
      while (sunday.getUTCDay() !== 0) sunday.setUTCDate(sunday.getUTCDate() + 1);
      assert.equal((await book({ appointmentDate: sunday.toISOString().slice(0, 10) })).status, 400);
      assert.equal((await book({ appointmentDate: '2020-01-01' })).status, 400);
      assert.equal((await book({ paymentStatus: 'PAID' })).status, 400);
    });

    test('expired payment holds free the slot and are cancelled', async () => {
      const date = uniqueDate();
      const first = await book({ appointmentDate: date });
      await models.Appointment.updateOne({ _id: first.body.data.appointmentId }, { $set: { holdExpiresAt: new Date(Date.now() - 1000) } });
      const slots = await agent.get(`/api/appointment/booked-slots?date=${date}`);
      assert.deepEqual(slots.body.data, []);
      assert.equal((await dbDoc(first.body.data.appointmentId)).status, 'CANCELLED');
      assert.equal((await book({ appointmentDate: date, phoneNumber: phone() })).status, 201);
    });

    test('removed Razorpay routes are gone', async () => {
      assert.equal((await agent.post('/api/payment/verify').send({})).status, 404);
      assert.equal((await agent.post('/api/payment/webhook').send({})).status, 404);
    });
  });

  describe('dashboard authentication', () => {
    const protectedRoutes = [
      ['get', '/api/dashboard/appointments'],
      ['post', '/api/dashboard/appointments'],
      ['post', '/api/dashboard/appointments/64b000000000000000000001/confirm-payment'],
      ['post', '/api/dashboard/appointments/64b000000000000000000001/attendance'],
      ['post', '/api/dashboard/appointments/64b000000000000000000001/cancel'],
      ['post', '/api/dashboard/appointments/64b000000000000000000001/retry'],
      ['get', '/api/dashboard/patients?search=abc'],
      ['get', '/api/auth/me'],
      ['post', '/api/auth/logout'],
    ];

    for (const [method, path] of protectedRoutes) {
      test(`${method.toUpperCase()} ${path} returns 401 without a token`, async () => {
        const res = await agent[method](path).send({});
        assert.equal(res.status, 401);
        assert.equal(res.body.success, false);
      });
    }

    test('a garbage or malformed token is rejected', async () => {
      for (const header of ['Bearer nonsense', 'Basic abc', 'Bearer ']) {
        const res = await agent.get('/api/dashboard/appointments').set('Authorization', header);
        assert.equal(res.status, 401);
      }
    });

    test('login failures are generic and never reveal whether the account exists', async () => {
      const wrongPassword = await agent.post('/api/auth/login').send({ email: 'staff@sunaina-clinic.com', password: 'wrong-password-1A' });
      const unknownUser = await agent.post('/api/auth/login').send({ email: 'nobody@sunaina-clinic.com', password: 'wrong-password-1A' });
      const inactive = await agent.post('/api/auth/login').send({ email: 'inactive@sunaina-clinic.com', password: PASSWORD });
      for (const res of [wrongPassword, unknownUser, inactive]) {
        assert.equal(res.status, 401);
        assert.equal(res.body.message, 'Invalid email or password.');
      }
    });

    test('passwords are stored hashed and never returned', async () => {
      const user = await models.User.findOne({ email: 'staff@sunaina-clinic.com' }).select('+passwordHash').lean();
      assert.match(user.passwordHash, /^scrypt\$/);
      assert.equal(user.passwordHash.includes(PASSWORD), false);
      const me = await agent.get('/api/auth/me').set(auth('STAFF'));
      assert.equal(me.status, 200);
      assert.equal(JSON.stringify(me.body).includes('passwordHash'), false);
      assert.equal(me.body.data.user.role, 'STAFF');
    });

    test('auth responses are not cacheable', async () => {
      const me = await agent.get('/api/auth/me').set(auth('STAFF'));
      assert.equal(me.headers['cache-control'], 'no-store');
    });

    test('logout revokes the token server-side', async () => {
      const login = await agent.post('/api/auth/login').send({ email: 'staff@sunaina-clinic.com', password: PASSWORD });
      const header = { Authorization: `Bearer ${login.body.data.token}` };
      assert.equal((await agent.get('/api/dashboard/appointments').set(header)).status, 200);
      assert.equal((await agent.post('/api/auth/logout').set(header)).status, 200);
      assert.equal((await agent.get('/api/dashboard/appointments').set(header)).status, 401);
    });

    test('an expired session is rejected and removed', async () => {
      const login = await agent.post('/api/auth/login').send({ email: 'staff@sunaina-clinic.com', password: PASSWORD });
      await models.Session.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const header = { Authorization: `Bearer ${login.body.data.token}` };
      assert.equal((await agent.get('/api/auth/me').set(header)).status, 401);
      assert.equal(await models.Session.countDocuments({ expiresAt: { $lt: new Date() } }), 3);
      const fresh = await agent.post('/api/auth/login').send({ email: 'staff@sunaina-clinic.com', password: PASSWORD });
      tokens.STAFF = fresh.body.data.token;
      for (const role of ['ADMIN', 'CLINICIAN']) {
        const res = await agent.post('/api/auth/login').send({ email: `${role.toLowerCase()}@sunaina-clinic.com`, password: PASSWORD });
        tokens[role] = res.body.data.token;
      }
    });

    test('an idle session times out', async () => {
      const login = await agent.post('/api/auth/login').send({ email: 'staff@sunaina-clinic.com', password: PASSWORD });
      const header = { Authorization: `Bearer ${login.body.data.token}` };
      await models.Session.updateMany({}, { $set: { lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000) } });
      assert.equal((await agent.get('/api/auth/me').set(header)).status, 401);
      for (const role of ['ADMIN', 'CLINICIAN', 'STAFF']) {
        const res = await agent.post('/api/auth/login').send({ email: `${role.toLowerCase()}@sunaina-clinic.com`, password: PASSWORD });
        tokens[role] = res.body.data.token;
      }
    });

    test('a deactivated user loses access immediately', async () => {
      await models.User.create({ name: 'Temp', email: 'temp@sunaina-clinic.com', role: 'STAFF', passwordHash: (await models.User.findOne({ email: 'staff@sunaina-clinic.com' }).select('+passwordHash')).passwordHash });
      const login = await agent.post('/api/auth/login').send({ email: 'temp@sunaina-clinic.com', password: PASSWORD });
      const header = { Authorization: `Bearer ${login.body.data.token}` };
      assert.equal((await agent.get('/api/auth/me').set(header)).status, 200);
      await models.User.updateOne({ email: 'temp@sunaina-clinic.com' }, { $set: { active: false } });
      assert.equal((await agent.get('/api/auth/me').set(header)).status, 401);
    });

    test('repeated failures lock the account, even for the correct password', async () => {
      await models.User.create({ name: 'Lock', email: 'lock@sunaina-clinic.com', role: 'STAFF', passwordHash: (await models.User.findOne({ email: 'staff@sunaina-clinic.com' }).select('+passwordHash')).passwordHash });
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await agent.post('/api/auth/login').send({ email: 'lock@sunaina-clinic.com', password: 'bad-password-1A' });
      }
      const res = await agent.post('/api/auth/login').send({ email: 'lock@sunaina-clinic.com', password: PASSWORD });
      assert.equal(res.status, 429);
    });
  });

  describe('role-based authorization', () => {
    test('STAFF can view and create but cannot confirm payment, mark attendance or cancel', async () => {
      const booked = await book();
      const id = booked.body.data.appointmentId;
      assert.equal((await agent.get('/api/dashboard/appointments').set(auth('STAFF'))).status, 200);
      assert.equal((await pay(id, 'STAFF')).status, 403);
      assert.equal((await attend(id, 'COMPLETED', 'STAFF')).status, 403);
      assert.equal((await agent.post(`/api/dashboard/appointments/${id}/cancel`).set(auth('STAFF')).send({})).status, 403);
      assert.equal((await agent.post(`/api/dashboard/appointments/${id}/retry`).set(auth('STAFF')).send({})).status, 403);
      assert.equal((await dbDoc(id)).status, 'PENDING_PAYMENT');
    });

    test('STAFF cannot record a payment while creating an offline appointment', async () => {
      const res = await agent.post('/api/dashboard/appointments').set(auth('STAFF')).send({
        appointmentDate: uniqueDate(), timeSlot: '11:00 AM', consultationType: 'offline',
        fullName: 'Walk In', phoneNumber: phone(), payment: { method: 'CASH' },
      });
      assert.equal(res.status, 403);
      assert.equal(await models.Appointment.countDocuments({ fullName: 'Walk In' }), 0);
    });

    test('CLINICIAN and ADMIN can perform privileged actions', async () => {
      const a = await book();
      const b = await book();
      assert.equal((await pay(a.body.data.appointmentId, 'ADMIN')).status, 200);
      assert.equal((await pay(b.body.data.appointmentId, 'CLINICIAN')).status, 200);
    });
  });

  describe('website appointment: full workflow', () => {
    test('book -> pay -> confirmed -> calendar+meet -> email -> whatsapp -> completed -> feedback', async () => {
      const booked = await book({ fullName: 'Priya Sharma', email: 'priya@example.com' });
      const id = booked.body.data.appointmentId;
      assert.equal(fake.state.emails.length, 0);

      const paid = await pay(id, 'CLINICIAN', { method: 'UPI', amount: 500, reference: 'UTR998877' });
      assert.equal(paid.status, 200);
      const data = paid.body.data;
      assert.equal(data.status, 'CONFIRMED');
      assert.equal(data.paymentStatus, 'PAID');
      assert.equal(data.paymentMethod, 'UPI');
      assert.equal(data.paymentAmount, 500);
      assert.equal(data.paymentConfirmedBy, 'CLINICIAN User');
      assert.ok(data.paymentConfirmedAt);
      assert.match(data.meetUrl, /^https:\/\/meet\.google\.com\//);
      assert.equal(data.calendarStatus, 'READY');
      assert.equal(data.meetingStatus, 'READY');
      assert.equal(data.notifications.patientEmail, 'SENT');
      assert.equal(data.notifications.clinicEmail, 'SENT');
      assert.equal(data.notifications.patientWhatsapp, 'SENT');
      assert.equal(data.notifications.clinicWhatsapp, 'SENT');

      assert.equal(fake.state.events.size, 1);
      const patientMail = emailsTo('priya@example.com');
      assert.equal(patientMail.length, 1);
      assert.match(patientMail[0].from, /<appointments@sunaina-clinic\.com>/);
      assert.ok(patientMail[0].text.includes(data.meetUrl));
      assert.equal(emailsTo('appointments@sunaina-clinic.com').length, 1);
      assert.equal(fake.state.whatsapp.filter((m) => m.template === 'appointment_confirmation').length, 1);
      assert.equal(fake.state.whatsapp.filter((m) => m.template === 'clinic_new_appointment').length, 1);

      const confirmed = await agent.get('/api/dashboard/appointments?status=CONFIRMED').set(auth('STAFF'));
      assert.ok(confirmed.body.data.some((item) => item.id === id));

      const done = await attend(id, 'COMPLETED');
      assert.equal(done.status, 200);
      assert.equal(done.body.data.status, 'COMPLETED');
      assert.equal(done.body.data.attendanceMarkedBy, 'CLINICIAN User');
      assert.ok(done.body.data.attendanceMarkedAt);
      assert.equal(done.body.data.feedbackEligible, true);
      assert.equal(done.body.data.feedbackRequested, true);
      assert.ok(done.body.data.feedbackRequestedAt);
      assert.equal(done.body.data.notifications.feedbackEmail, 'SENT');
      assert.equal(done.body.data.notifications.feedbackWhatsapp, 'SENT');

      const feedbackMail = emailsTo('priya@example.com').filter((m) => /How was your visit/.test(m.subject));
      assert.equal(feedbackMail.length, 1);
      assert.ok(feedbackMail[0].text.includes('/feedback'));
      assert.equal(fake.state.whatsapp.filter((m) => m.template === 'feedback_request').length, 1);

      const stillConfirmed = await agent.get('/api/dashboard/appointments?status=CONFIRMED').set(auth('STAFF'));
      assert.equal(stillConfirmed.body.data.some((item) => item.id === id), false);
    });

    test('paying an offline-type appointment creates a calendar event with no Meet link', async () => {
      const booked = await book({ consultationType: 'offline' });
      const paid = await pay(booked.body.data.appointmentId);
      assert.equal(paid.body.data.meetUrl, '');
      assert.equal(paid.body.data.meetingStatus, 'NOT_REQUIRED');
      assert.equal(paid.body.data.calendarStatus, 'READY');
      const [event] = [...fake.state.events.values()];
      assert.equal(event.conferenceData, undefined);
      assert.ok(event.location);
    });

    test('duplicate payment confirmation is rejected and creates nothing twice', async () => {
      const booked = await book();
      const id = booked.body.data.appointmentId;
      assert.equal((await pay(id)).status, 200);
      const before = { events: fake.state.events.size, emails: fake.state.emails.length, wa: fake.state.whatsapp.length };
      const again = await pay(id);
      assert.equal(again.status, 409);
      assert.equal(fake.state.events.size, before.events);
      assert.equal(fake.state.emails.length, before.emails);
      assert.equal(fake.state.whatsapp.length, before.wa);
    });

    test('simultaneous confirmations produce one confirmation and one set of messages', { skip: !atomicDb }, async () => {
      const booked = await book();
      const id = booked.body.data.appointmentId;
      const results = await Promise.all([pay(id), pay(id, 'ADMIN'), pay(id)]);
      assert.equal(results.filter((r) => r.status === 200).length, 1);
      assert.equal(fake.state.events.size, 1);
      assert.equal(emailsTo('asha@example.com').length, 1);
      assert.equal(fake.state.whatsapp.filter((m) => m.template === 'appointment_confirmation').length, 1);
    });

    test('duplicate attendance marking is rejected and sends no second feedback request', async () => {
      const booked = await book();
      const id = booked.body.data.appointmentId;
      await pay(id);
      assert.equal((await attend(id, 'COMPLETED')).status, 200);
      const feedbackBefore = fake.state.whatsapp.filter((m) => m.template === 'feedback_request').length;
      assert.equal((await attend(id, 'COMPLETED')).status, 409);
      assert.equal((await attend(id, 'ABSENT')).status, 409);
      assert.equal(fake.state.whatsapp.filter((m) => m.template === 'feedback_request').length, feedbackBefore);
      assert.equal((await dbDoc(id)).status, 'COMPLETED');
    });

    test('simultaneous attendance clicks produce one feedback request', { skip: !atomicDb }, async () => {
      const booked = await book();
      const id = booked.body.data.appointmentId;
      await pay(id);
      const results = await Promise.all([attend(id, 'COMPLETED'), attend(id, 'COMPLETED'), attend(id, 'ABSENT')]);
      assert.equal(results.filter((r) => r.status === 200).length, 1);
      const stored = await dbDoc(id);
      assert.equal(fake.state.whatsapp.filter((m) => m.template === 'feedback_request').length, stored.status === 'COMPLETED' ? 1 : 0);
    });
  });

  describe('absent and cancelled appointments', () => {
    test('ABSENT records attendance and never requests feedback', async () => {
      const booked = await book({ email: 'absent@example.com' });
      const id = booked.body.data.appointmentId;
      await pay(id);
      const sentBefore = fake.state.emails.length;
      const waBefore = fake.state.whatsapp.length;
      const res = await attend(id, 'ABSENT');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'ABSENT');
      assert.equal(res.body.data.feedbackEligible, false);
      assert.equal(res.body.data.feedbackRequested, false);
      assert.equal(res.body.data.attendanceMarkedBy, 'CLINICIAN User');
      assert.ok(res.body.data.attendanceMarkedAt);
      assert.equal(fake.state.emails.length, sentBefore);
      assert.equal(fake.state.whatsapp.length, waBefore);
      const retry = await agent.post(`/api/dashboard/appointments/${id}/retry`).set(auth('CLINICIAN')).send({});
      assert.equal(retry.status, 409);
      assert.equal(fake.state.emails.length, sentBefore);
    });

    test('a pending appointment can be cancelled: no feedback, slot is freed', async () => {
      const date = uniqueDate();
      const booked = await book({ appointmentDate: date });
      const id = booked.body.data.appointmentId;
      const res = await agent.post(`/api/dashboard/appointments/${id}/cancel`).set(auth('CLINICIAN')).send({ reason: 'Patient request' });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'CANCELLED');
      assert.equal(res.body.data.feedbackEligible, false);
      assert.equal(res.body.data.feedbackRequested, false);
      assert.equal(fake.state.emails.length, 0);
      assert.equal((await book({ appointmentDate: date, phoneNumber: phone() })).status, 201);
    });

    test('cancelling a confirmed virtual appointment removes the calendar event', async () => {
      const booked = await book();
      const id = booked.body.data.appointmentId;
      await pay(id);
      assert.equal(fake.state.events.size, 1);
      const res = await agent.post(`/api/dashboard/appointments/${id}/cancel`).set(auth('ADMIN')).send({});
      assert.equal(res.status, 200);
      assert.equal(fake.state.events.size, 0);
      assert.equal(res.body.data.calendarStatus, 'CANCELLED');
    });

    test('invalid transitions are rejected', async () => {
      const pending = (await book()).body.data.appointmentId;
      assert.equal((await attend(pending, 'COMPLETED')).status, 409);
      assert.equal((await attend(pending, 'ABSENT')).status, 409);

      const cancelled = (await book()).body.data.appointmentId;
      await agent.post(`/api/dashboard/appointments/${cancelled}/cancel`).set(auth('ADMIN')).send({});
      assert.equal((await pay(cancelled)).status, 409);
      assert.equal((await attend(cancelled, 'COMPLETED')).status, 409);
      assert.equal((await agent.post(`/api/dashboard/appointments/${cancelled}/cancel`).set(auth('ADMIN')).send({})).status, 409);

      const completed = (await book()).body.data.appointmentId;
      await pay(completed);
      await attend(completed, 'COMPLETED');
      assert.equal((await agent.post(`/api/dashboard/appointments/${completed}/cancel`).set(auth('ADMIN')).send({})).status, 409);
      assert.equal((await pay(completed)).status, 409);

      const bad = await attend(pending, 'CONFIRMED');
      assert.equal(bad.status, 400);
      assert.equal((await dbDoc(pending)).status, 'PENDING_PAYMENT');
    });

    test('payment methods and amounts are validated', async () => {
      const id = (await book()).body.data.appointmentId;
      assert.equal((await pay(id, 'ADMIN', { method: 'BITCOIN' })).status, 400);
      assert.equal((await pay(id, 'ADMIN', {})).status, 400);
      assert.equal((await pay(id, 'ADMIN', { method: 'CASH', amount: -5 })).status, 400);
      assert.equal((await pay(id, 'ADMIN', { method: 'CASH', status: 'PAID' })).status, 400);
      assert.equal((await dbDoc(id)).status, 'PENDING_PAYMENT');
      assert.equal((await pay('not-an-id', 'ADMIN', { method: 'CASH' })).status, 400);
      assert.equal((await pay('64b000000000000000000001', 'ADMIN', { method: 'CASH' })).status, 404);
    });

    test('each supported payment method is accepted', async () => {
      for (const method of ['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER']) {
        const id = (await book()).body.data.appointmentId;
        const res = await pay(id, 'ADMIN', { method });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.paymentMethod, method);
      }
    });
  });

  describe('consent', () => {
    test('no WhatsApp opt-in means no WhatsApp messages are ever sent', async () => {
      const booked = await book({ whatsappOptIn: false, email: 'noconsent@example.com' });
      const id = booked.body.data.appointmentId;
      const paid = await pay(id);
      assert.equal(paid.body.data.notifications.patientWhatsapp, 'SKIPPED');
      assert.equal(paid.body.data.whatsappOptIn, false);
      await attend(id, 'COMPLETED');
      assert.equal(fake.state.whatsapp.filter((m) => m.to !== '919111111111').length, 0);
      assert.equal(emailsTo('noconsent@example.com').length, 2);
    });

    test('opt-in is stored with timestamp and source', async () => {
      const number = phone();
      await book({ phoneNumber: number, whatsappOptIn: true });
      const patient = await models.Patient.findOne({ whatsappNumber: `91${number}` }).lean();
      assert.equal(patient.whatsappOptIn, true);
      assert.equal(patient.whatsappOptInSource, 'WEBSITE_BOOKING');
      assert.ok(patient.whatsappOptInAt);
      assert.equal(patient.source, 'WEBSITE');
    });

    test('STOP via the signed webhook opts the patient out and stops messages', async () => {
      const number = phone();
      const booked = await book({ phoneNumber: number, whatsappOptIn: true });
      const body = { entry: [{ id: 'waba-1', changes: [{ value: { messages: [{ from: `91${number}`, type: 'text', text: { body: 'stop' } }] } }] }] };
      const raw = JSON.stringify(body);
      const signature = `sha256=${createHmac('sha256', 'app-secret').update(raw).digest('hex')}`;
      const res = await agent.post('/api/whatsapp/webhook').set('Content-Type', 'application/json').set('X-Hub-Signature-256', signature).send(raw);
      assert.equal(res.status, 200);
      const patient = await models.Patient.findOne({ whatsappNumber: `91${number}` }).lean();
      assert.equal(patient.whatsappOptIn, false);
      assert.ok(patient.whatsappOptOutAt);
      const paid = await pay(booked.body.data.appointmentId);
      assert.equal(paid.body.data.notifications.patientWhatsapp, 'SKIPPED');
    });

    test('webhook rejects a missing or wrong signature and verifies the handshake', async () => {
      assert.equal((await agent.post('/api/whatsapp/webhook').send({ entry: [] })).status, 403);
      assert.equal((await agent.post('/api/whatsapp/webhook').set('X-Hub-Signature-256', 'sha256=00').send({ entry: [] })).status, 403);
      const ok = await agent.get('/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc123');
      assert.equal(ok.status, 200);
      assert.equal(ok.text, 'abc123');
      assert.equal((await agent.get('/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=x')).status, 403);
    });
  });

  describe('offline patients', () => {
    test('create patient + appointment + payment in one step -> CONFIRMED with full automation', async () => {
      const number = phone();
      const res = await agent.post('/api/dashboard/appointments').set(auth('ADMIN')).send({
        appointmentDate: uniqueDate(), timeSlot: '11:00 AM', consultationType: 'virtual',
        fullName: 'Meera Walkin', phoneNumber: number, email: 'meera@example.com', whatsappOptIn: true,
        payment: { method: 'CASH', amount: 500 },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.source, 'OFFLINE');
      assert.equal(res.body.data.status, 'CONFIRMED');
      assert.equal(res.body.data.paymentMethod, 'CASH');
      assert.match(res.body.data.meetUrl, /meet\.google\.com/);
      assert.equal(emailsTo('meera@example.com').length, 1);
      assert.equal(fake.state.whatsapp.filter((m) => m.template === 'appointment_confirmation').length, 1);
      const patient = await models.Patient.findOne({ whatsappNumber: `91${number}` }).lean();
      assert.equal(patient.source, 'OFFLINE');
      assert.equal(patient.whatsappOptInSource, 'DASHBOARD');
      assert.equal((await attend(res.body.data.id, 'COMPLETED')).body.data.feedbackEligible, true);
    });

    test('offline appointment without payment stays PENDING_PAYMENT with no expiring hold', async () => {
      const res = await agent.post('/api/dashboard/appointments').set(auth('STAFF')).send({
        appointmentDate: uniqueDate(), timeSlot: '11:30 AM', consultationType: 'offline',
        fullName: 'Kavya Walkin', phoneNumber: phone(),
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'PENDING_PAYMENT');
      assert.equal(res.body.data.holdExpiresAt, null);
      assert.equal(res.body.data.email, '');
      assert.equal(fake.state.emails.length, 0);
      const stored = await dbDoc(res.body.data.id);
      assert.equal(stored.patientId != null, true);
    });

    test('offline appointments with no email skip patient email but still confirm', async () => {
      const res = await agent.post('/api/dashboard/appointments').set(auth('ADMIN')).send({
        appointmentDate: uniqueDate(), timeSlot: '12:00 PM', consultationType: 'offline',
        fullName: 'No Email', phoneNumber: phone(), payment: { method: 'CASH' },
      });
      assert.equal(res.body.data.status, 'CONFIRMED');
      assert.equal(res.body.data.notifications.patientEmail, 'SKIPPED');
      assert.equal(res.body.data.notifications.clinicEmail, 'SENT');
    });

    test('the same phone number never creates a duplicate patient record', async () => {
      const number = phone();
      await book({ phoneNumber: number, fullName: 'Repeat Patient' });
      await book({ phoneNumber: `+91 ${number.slice(0, 5)} ${number.slice(5)}`, fullName: 'Repeat Patient' });
      await agent.post('/api/dashboard/appointments').set(auth('STAFF')).send({
        appointmentDate: uniqueDate(), timeSlot: '12:30 PM', consultationType: 'offline',
        fullName: 'Repeat Patient', phoneNumber: number,
      });
      assert.equal(await models.Patient.countDocuments({ whatsappNumber: `91${number}` }), 1);
      assert.equal(await models.Appointment.countDocuments({ phoneNormalized: `91${number}` }), 3);
    });

    test('dashboard booking cannot take an already booked slot', async () => {
      const date = uniqueDate();
      await book({ appointmentDate: date });
      const res = await agent.post('/api/dashboard/appointments').set(auth('ADMIN')).send({
        appointmentDate: date, timeSlot: '10:00 AM', consultationType: 'offline', fullName: 'Clash', phoneNumber: phone(),
      });
      assert.equal(res.status, 409);
    });

    test('patient search finds by name and phone and requires auth', async () => {
      const number = phone();
      await book({ phoneNumber: number, fullName: 'Searchable Person' });
      const byName = await agent.get('/api/dashboard/patients?search=searchable').set(auth('STAFF'));
      assert.ok(byName.body.data.some((p) => p.name === 'Searchable Person'));
      const byPhone = await agent.get(`/api/dashboard/patients?search=${number}`).set(auth('STAFF'));
      assert.ok(byPhone.body.data.some((p) => p.whatsappNumber === `91${number}`));
      assert.equal((await agent.get('/api/dashboard/patients?search=ab').set(auth('STAFF'))).status, 400);
    });
  });

  describe('external failures never corrupt appointment state', () => {
    test('calendar outage: payment stays confirmed, emails still go out, retry completes without duplicates', async () => {
      const booked = await book({ email: 'outage@example.com' });
      const id = booked.body.data.appointmentId;
      fake.state.failCalendar = true;
      const paid = await pay(id);
      assert.equal(paid.status, 200);
      assert.equal(paid.body.data.status, 'CONFIRMED');
      assert.equal(paid.body.data.paymentStatus, 'PAID');
      assert.equal(paid.body.data.calendarStatus, 'FAILED');
      assert.equal(paid.body.data.meetingStatus, 'FAILED');
      assert.equal(paid.body.data.notifications.patientEmail, 'SENT');
      const sentBefore = emailsTo('outage@example.com').length;

      fake.state.failCalendar = false;
      const retried = await agent.post(`/api/dashboard/appointments/${id}/retry`).set(auth('CLINICIAN')).send({});
      assert.equal(retried.status, 200);
      assert.equal(retried.body.data.calendarStatus, 'READY');
      assert.match(retried.body.data.meetUrl, /meet\.google\.com/);
      assert.equal(fake.state.events.size, 1);
      assert.equal(emailsTo('outage@example.com').length, sentBefore + 1);
      assert.match(emailsTo('outage@example.com').at(-1).text, /meet\.google\.com/);

      const again = await agent.post(`/api/dashboard/appointments/${id}/retry`).set(auth('CLINICIAN')).send({});
      assert.equal(again.status, 200);
      assert.equal(fake.state.events.size, 1);
      assert.equal(emailsTo('outage@example.com').length, sentBefore + 1);
    });

    test('whatsapp outage does not affect payment; retry sends it exactly once', async () => {
      const booked = await book();
      const id = booked.body.data.appointmentId;
      fake.state.failWhatsApp = true;
      const paid = await pay(id);
      assert.equal(paid.body.data.status, 'CONFIRMED');
      assert.equal(paid.body.data.paymentStatus, 'PAID');
      assert.equal(paid.body.data.notifications.patientWhatsapp, 'FAILED');
      assert.equal(paid.body.data.notifications.patientEmail, 'SENT');
      fake.state.failWhatsApp = false;
      const retried = await agent.post(`/api/dashboard/appointments/${id}/retry`).set(auth('ADMIN')).send({});
      assert.equal(retried.body.data.notifications.patientWhatsapp, 'SENT');
      assert.equal(fake.state.whatsapp.filter((m) => m.template === 'appointment_confirmation').length, 1);
      assert.equal(fake.state.events.size, 1);
    });

    test('gmail outage does not block confirmation or attendance; feedback retry works', async () => {
      const booked = await book({ email: 'gmailfail@example.com' });
      const id = booked.body.data.appointmentId;
      fake.state.failGmail = true;
      const paid = await pay(id);
      assert.equal(paid.body.data.status, 'CONFIRMED');
      assert.equal(paid.body.data.notifications.patientEmail, 'FAILED');
      const done = await attend(id, 'COMPLETED');
      assert.equal(done.body.data.status, 'COMPLETED');
      assert.equal(done.body.data.notifications.feedbackEmail, 'FAILED');
      fake.state.failGmail = false;
      const retry = await agent.post(`/api/dashboard/appointments/${id}/retry`).set(auth('ADMIN')).send({});
      assert.equal(retry.body.data.notifications.feedbackEmail, 'SENT');
      assert.equal(retry.body.data.feedbackRequested, true);
      assert.equal(emailsTo('gmailfail@example.com').filter((m) => /How was your visit/.test(m.subject)).length, 1);
    });

    test('a leaked server error never exposes internals', async () => {
      const res = await agent.get('/api/dashboard/appointments?status=NOPE').set(auth('ADMIN'));
      assert.equal(res.status, 400);
      assert.equal(JSON.stringify(res.body).includes('node_modules'), false);
    });
  });

  describe('listing: sorting, filtering, pagination', () => {
    let fixtures;

    before(async () => {
      await models.Appointment.deleteMany({});
      await models.Patient.deleteMany({});
      const base = workday(40);
      const next = workday(41);
      const later = workday(42);
      const mk = async (overrides) => {
        const res = await agent.post('/api/dashboard/appointments').set(auth('ADMIN')).send({
          consultationType: 'offline', phoneNumber: phone(), ...overrides,
        });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        return res.body.data;
      };
      const zara = await mk({ appointmentDate: later, timeSlot: '10:00 AM', fullName: 'zara Khan', payment: { method: 'UPI' } });
      const amit = await mk({ appointmentDate: base, timeSlot: '03:00 PM', fullName: 'Amit Roy', payment: { method: 'CASH' } });
      const beena = await mk({ appointmentDate: base, timeSlot: '10:30 AM', fullName: 'Beena Das' });
      const chitra = await mk({ appointmentDate: next, timeSlot: '11:00 AM', fullName: 'Chitra Paul', consultationType: 'virtual', payment: { method: 'UPI' } });
      await attend(amit.id, 'COMPLETED');
      await attend(chitra.id, 'ABSENT');
      await agent.post(`/api/dashboard/appointments/${beena.id}/cancel`).set(auth('ADMIN')).send({});
      fixtures = { zara, amit, beena, chitra, base, next, later };
    });

    const list = (qs, role = 'STAFF') => agent.get(`/api/dashboard/appointments?${qs}`).set(auth(role));
    const names = (res) => res.body.data.map((item) => item.fullName);

    test('default order is nearest appointment first', async () => {
      const res = await list('');
      assert.deepEqual(names(res), ['Beena Das', 'Amit Roy', 'Chitra Paul', 'zara Khan']);
    });

    test('sort by appointment date/time ascending and descending', async () => {
      assert.deepEqual(names(await list('sortBy=appointmentDateTime&sortOrder=asc')), ['Beena Das', 'Amit Roy', 'Chitra Paul', 'zara Khan']);
      assert.deepEqual(names(await list('sortBy=appointmentDateTime&sortOrder=desc')), ['zara Khan', 'Chitra Paul', 'Amit Roy', 'Beena Das']);
    });

    test('time ordering within one day is chronological across AM/PM', async () => {
      const res = await list(`date=${fixtures.base}&sortBy=appointmentDateTime&sortOrder=asc`);
      assert.deepEqual(res.body.data.map((i) => i.timeSlot), ['10:30 AM', '03:00 PM']);
    });

    test('sort by newest and oldest created', async () => {
      assert.deepEqual(names(await list('sortBy=createdAt&sortOrder=desc')), ['Chitra Paul', 'Beena Das', 'Amit Roy', 'zara Khan']);
      assert.deepEqual(names(await list('sortBy=createdAt&sortOrder=asc')), ['zara Khan', 'Amit Roy', 'Beena Das', 'Chitra Paul']);
    });

    test('sort by patient name is case-insensitive in both directions', async () => {
      assert.deepEqual(names(await list('sortBy=patientName&sortOrder=asc')), ['Amit Roy', 'Beena Das', 'Chitra Paul', 'zara Khan']);
      assert.deepEqual(names(await list('sortBy=patientName&sortOrder=desc')), ['zara Khan', 'Chitra Paul', 'Beena Das', 'Amit Roy']);
    });

    test('status filter', async () => {
      assert.deepEqual(names(await list('status=COMPLETED')), ['Amit Roy']);
      assert.deepEqual(names(await list('status=ABSENT')), ['Chitra Paul']);
      assert.deepEqual(names(await list('status=CANCELLED')), ['Beena Das']);
      assert.deepEqual(names(await list('status=CONFIRMED')), ['zara Khan']);
      assert.deepEqual(names(await list('status=PENDING_PAYMENT')), []);
    });

    test('single date and date-range filters', async () => {
      assert.deepEqual(names(await list(`date=${fixtures.base}&sortBy=appointmentDateTime`)), ['Beena Das', 'Amit Roy']);
      assert.deepEqual(names(await list(`dateFrom=${fixtures.next}&dateTo=${fixtures.later}`)), ['Chitra Paul', 'zara Khan']);
      assert.deepEqual(names(await list(`dateFrom=${fixtures.later}`)), ['zara Khan']);
      assert.deepEqual(names(await list(`dateTo=${fixtures.base}`)), ['Beena Das', 'Amit Roy']);
    });

    test('search by patient name (partial, case-insensitive) and by phone', async () => {
      assert.deepEqual(names(await list('search=ZARA')), ['zara Khan']);
      assert.deepEqual(names(await list('search=roy')), ['Amit Roy']);
      const phoneNumber = fixtures.amit.phoneNumber;
      assert.deepEqual(names(await list(`search=${phoneNumber.slice(-6)}`)), ['Amit Roy']);
      assert.deepEqual(names(await list(`search=${encodeURIComponent('+91 ' + phoneNumber)}`)), ['Amit Roy']);
      assert.deepEqual(names(await list(`search=${fixtures.zara.appointmentNumber}`)), ['zara Khan']);
      assert.deepEqual(names(await list('search=nobody')), []);
    });

    test('regex characters in search are treated literally', async () => {
      const res = await list(`search=${encodeURIComponent('.*')}`);
      assert.equal(res.status, 200);
      assert.deepEqual(names(res), []);
    });

    test('payment status, consultation type and patient source filters', async () => {
      assert.deepEqual(names(await list('paymentStatus=PAID&sortBy=patientName')), ['Amit Roy', 'Chitra Paul', 'zara Khan']);
      assert.deepEqual(names(await list('paymentStatus=PENDING')), ['Beena Das']);
      assert.deepEqual(names(await list('consultationType=virtual')), ['Chitra Paul']);
      assert.equal((await list('source=OFFLINE')).body.data.length, 4);
      assert.equal((await list('source=WEBSITE')).body.data.length, 0);
    });

    test('filters combine: status + date + search', async () => {
      assert.deepEqual(names(await list(`status=COMPLETED&date=${fixtures.base}&search=amit`)), ['Amit Roy']);
      assert.deepEqual(names(await list(`status=COMPLETED&date=${fixtures.next}&search=amit`)), []);
      assert.deepEqual(names(await list(`status=CONFIRMED&paymentStatus=PAID&dateFrom=${fixtures.base}&search=khan`)), ['zara Khan']);
      assert.deepEqual(names(await list(`status=CONFIRMED&search=amit`)), []);
    });

    test('status counts ignore the status filter but respect the other filters', async () => {
      const all = await list('');
      assert.deepEqual(all.body.counts, { CONFIRMED: 1, COMPLETED: 1, ABSENT: 1, CANCELLED: 1 });
      const filtered = await list(`status=COMPLETED&dateFrom=${fixtures.next}`);
      assert.deepEqual(filtered.body.counts, { ABSENT: 1, CONFIRMED: 1 });
    });

    test('pagination is applied in the database', async () => {
      const page1 = await list('limit=2&page=1');
      const page2 = await list('limit=2&page=2');
      assert.equal(page1.body.data.length, 2);
      assert.equal(page2.body.data.length, 2);
      assert.equal(page1.body.pagination.total, 4);
      assert.equal(page1.body.pagination.pages, 2);
      assert.deepEqual([...names(page1), ...names(page2)], ['Beena Das', 'Amit Roy', 'Chitra Paul', 'zara Khan']);
    });

    test('invalid query values are rejected', async () => {
      for (const qs of ['status=BAD', 'sortBy=password', 'sortOrder=sideways', 'date=2026-13-45', 'limit=9999', 'page=0', `dateFrom=${fixtures.later}&dateTo=${fixtures.base}`]) {
        assert.equal((await list(qs)).status, 400, qs);
      }
    });
  });

  describe('reminders', () => {
    test('a due reminder is sent once to email and consenting WhatsApp', async () => {
      const { runReminderCycle } = await import('../jobs/reminderJob.js');
      const booked = await book({ email: 'remind@example.com' });
      const id = booked.body.data.appointmentId;
      await pay(id);
      await models.Appointment.updateOne({ _id: id }, { $set: { startsAt: new Date(Date.now() + 5 * 60 * 60 * 1000), paymentConfirmedAt: new Date(Date.now() - 4 * 60 * 60 * 1000) } });
      fake.reset();
      assert.ok((await runReminderCycle()) >= 1);
      assert.equal(emailsTo('remind@example.com').filter((m) => /Reminder/.test(m.subject)).length, 1);
      assert.equal(fake.state.whatsapp.filter((m) => m.template === 'appointment_reminder').length, 1);
      await runReminderCycle();
      assert.equal(emailsTo('remind@example.com').filter((m) => /Reminder/.test(m.subject)).length, 1);
      assert.equal(fake.state.whatsapp.filter((m) => m.template === 'appointment_reminder').length, 1);
    });

    test('reminders are never sent for non-confirmed appointments', async () => {
      const { runReminderCycle } = await import('../jobs/reminderJob.js');
      const id = (await book({ email: 'norem@example.com' })).body.data.appointmentId;
      await models.Appointment.updateOne({ _id: id }, { $set: { startsAt: new Date(Date.now() + 5 * 60 * 60 * 1000) } });
      fake.reset();
      await runReminderCycle();
      assert.equal(emailsTo('norem@example.com').length, 0);
    });
  });

  describe('data migration preserves existing records', () => {
    test('legacy NO_SHOW and Razorpay-era documents are upgraded in place without data loss', async () => {
      const { runMigrations } = await import('../config/migrations.js');
      const date = uniqueDate();
      const legacy = {
        appointmentNumber: 'SCLEGACY0001', appointmentDate: date, timeSlot: '04:00 PM', consultationType: 'virtual',
        fullName: 'Legacy Patient', phoneNumber: '9000000001', email: 'legacy@example.com', fee: 500, currency: 'INR',
        status: 'NO_SHOW', paymentStatus: 'PAID', paymentOrderId: 'order_x', paymentId: 'pay_x', googleEventId: 'oldevent',
        meetUrl: 'https://meet.google.com/old', meetingStatus: 'READY', createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-02'),
      };
      const paidLegacy = { ...legacy, appointmentNumber: 'SCLEGACY0002', timeSlot: '04:30 PM', status: 'CONFIRMED', phoneNumber: '9000000002' };
      const completedLegacy = { ...legacy, appointmentNumber: 'SCLEGACY0003', timeSlot: '05:00 PM', status: 'COMPLETED', phoneNumber: '9000000003' };
      await models.Appointment.collection.insertMany([legacy, paidLegacy, completedLegacy]);

      const result = await runMigrations();
      assert.equal(result.migrated, 3);

      const absent = await models.Appointment.findOne({ appointmentNumber: 'SCLEGACY0001' }).lean();
      assert.equal(absent.status, 'ABSENT');
      assert.equal(absent.meetUrl, 'https://meet.google.com/old');
      assert.equal(absent.googleEventId, 'oldevent');
      assert.equal(absent.paymentId, 'pay_x');
      assert.equal(absent.paymentMethod, 'RAZORPAY');
      assert.equal(absent.paymentAmount, 500);
      assert.equal(absent.calendarStatus, 'READY');
      assert.ok(absent.startsAt instanceof Date);
      assert.ok(absent.patientId);
      assert.equal(absent.slotKey, `${date}|04:00 PM`);
      assert.notEqual(absent.feedbackEligible, true);
      assert.equal(String(absent.createdAt), String(new Date('2025-01-01')));

      const done = await models.Appointment.findOne({ appointmentNumber: 'SCLEGACY0003' }).lean();
      assert.equal(done.feedbackEligible, true);
      assert.equal(done.feedbackRequested, true);

      const confirmedList = await agent.get(`/api/dashboard/appointments?search=SCLEGACY0002`).set(auth('ADMIN'));
      assert.equal(confirmedList.body.data[0].status, 'CONFIRMED');
      assert.equal(confirmedList.body.data[0].paymentMethod, 'RAZORPAY');

      const slots = await agent.get(`/api/appointment/booked-slots?date=${date}`);
      assert.ok(slots.body.data.includes('04:00 PM') && slots.body.data.includes('04:30 PM'));

      const again = await runMigrations();
      assert.equal(again.migrated, 0);
      assert.equal(await models.Appointment.countDocuments({ appointmentNumber: /^SCLEGACY/ }), 3);
    });

    test('an abandoned legacy Razorpay hold is released instead of blocking the slot', async () => {
      const { runMigrations } = await import('../config/migrations.js');
      const date = uniqueDate();
      await models.Appointment.collection.insertOne({
        appointmentNumber: 'SCLEGACY0009', appointmentDate: date, timeSlot: '06:00 PM', consultationType: 'offline',
        fullName: 'Abandoned', phoneNumber: '9000000009', email: 'a@example.com', fee: 500, currency: 'INR',
        status: 'PENDING_PAYMENT', paymentStatus: 'PENDING', paymentOrderId: 'order_abandoned', holdExpiresAt: new Date(Date.now() - 60000),
        createdAt: new Date(), updatedAt: new Date(),
      });
      await runMigrations();
      const slots = await agent.get(`/api/appointment/booked-slots?date=${date}`);
      assert.deepEqual(slots.body.data, []);
      assert.equal((await book({ appointmentDate: date, timeSlot: '06:00 PM', phoneNumber: phone() })).status, 201);
    });
  });

  describe('security', () => {
    test('google oauth setup routes are disabled by default', async () => {
      assert.equal((await agent.get('/api/google/authorize')).status, 404);
      assert.equal((await agent.get('/api/google/callback?code=x&state=y')).status, 404);
    });

    test('dashboard CORS allows the Authorization header for the site origin only', async () => {
      const ok = await agent.options('/api/dashboard/appointments').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'GET').set('Access-Control-Request-Headers', 'authorization');
      assert.match(String(ok.headers['access-control-allow-headers']), /Authorization/i);
      const bad = await agent.get('/api/dashboard/appointments').set('Origin', 'https://evil.example').set(auth('ADMIN'));
      assert.equal(bad.status, 403);
    });

    test('responses never leak tokens, hashes or env secrets', async () => {
      const res = await agent.get('/api/dashboard/appointments').set(auth('ADMIN'));
      const text = JSON.stringify(res.body);
      for (const secret of ['passwordHash', 'scrypt$', 'fake-access-token', 'app-secret', tokens.ADMIN]) {
        assert.equal(text.includes(secret), false, secret);
      }
    });

    test('NoSQL operator injection in filters and login is rejected', async () => {
      const unfiltered = await agent.get('/api/dashboard/appointments').set(auth('ADMIN'));
      const injected = await agent.get('/api/dashboard/appointments?status[$ne]=CANCELLED&search[$regex]=.*').set(auth('ADMIN'));
      assert.equal(injected.status, 200);
      assert.deepEqual(injected.body.pagination, unfiltered.body.pagination);
      const operatorValue = await agent.get('/api/dashboard/appointments?status=%7B%22%24ne%22%3A%22X%22%7D').set(auth('ADMIN'));
      assert.equal(operatorValue.status, 400);
      const login = await agent.post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
      assert.equal(login.status, 400);
    });

    test('login rate limiting kicks in after repeated failures from one client', async () => {
      let last;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        last = await agent.post('/api/auth/login').set('X-Forwarded-For', '203.0.113.9').send({ email: `ghost${attempt}@sunaina-clinic.com`, password: 'wrong-password-1A' });
      }
      assert.equal(last.status, 429);
    });
  });
});
