import { test, describe, mock, before } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';

let app;
let emailCalls;

before(async () => {
  emailCalls = [];

  mock.module('../models/CallbackRequest.js', {
    defaultExport: {
      create: async (doc) => ({
        _id: 'cb_route_1',
        ...doc,
        createdAt: new Date(),
      }),
    },
  });

  mock.module('../services/emailService.js', {
    namedExports: {
      sendCallbackRequest: async (args) => {
        emailCalls.push(args);
        return { id: 'email_route_1' };
      },
    },
  });

  const { default: contactRoutes } = await import(
    `../routes/contactRoutes.js?t=${Date.now()}`
  );

  app = express();
  app.use(express.json());
  app.use('/api/contact', contactRoutes);
});

describe('POST /api/contact/callback', () => {
  test('valid payload saves the request, sends the email, and returns 201', async () => {
    const res = await request(app)
      .post('/api/contact/callback')
      .send({ name: 'Asha Verma', phone: '9876543210' });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, 'cb_route_1');
    assert.equal(emailCalls.length, 1);
  });

  test('missing phone is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/contact/callback')
      .send({ name: 'Asha Verma' });

    assert.equal(res.status, 400);
  });

  test('invalid (non-Indian) phone number is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/contact/callback')
      .send({ name: 'Asha Verma', phone: '5551234567' });

    assert.equal(res.status, 400);
  });

  test('name below the 2 character minimum is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/contact/callback')
      .send({ name: 'A', phone: '9876543210' });

    assert.equal(res.status, 400);
  });
});
