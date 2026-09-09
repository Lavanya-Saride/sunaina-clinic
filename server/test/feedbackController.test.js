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

describe('feedbackController', () => {
  afterEach(() => {
    mock.reset();
  });

  test('getFeedback: returns the 10 most recent feedback entries', async () => {
    const docs = [{ name: 'A', story: 'Great care', createdAt: new Date() }];

    mock.module('../models/Feedback.js', {
      defaultExport: {
        find: () => ({
          sort: () => ({
            limit: (n) => {
              assert.equal(n, 10);
              return {
                select: () => ({
                  lean: async () => docs,
                }),
              };
            },
          }),
        }),
      },
    });

    const { getFeedback } = await import(
      `../controllers/feedbackController.js?t=${Date.now()}-1`
    );

    const req = {};
    const res = makeRes();

    await getFeedback(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, docs);
  });

  test('createFeedback: sanitizes input before saving and returns 201', async () => {
    let createArgs = null;

    mock.module('../models/Feedback.js', {
      defaultExport: {
        create: async (args) => {
          createArgs = args;
          return { _id: 'fb_1', ...args, createdAt: new Date('2026-01-01') };
        },
      },
    });

    const { createFeedback } = await import(
      `../controllers/feedbackController.js?t=${Date.now()}-2`
    );

    const req = {
      body: {
        name: '  <b>Asha</b>  Verma  ',
        story: 'The   care was <script>bad()</script>excellent throughout.',
      },
    };
    const res = makeRes();

    await createFeedback(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 201);
    assert.equal(createArgs.name, 'Asha Verma');
    assert.equal(createArgs.story, 'The care was bad()excellent throughout.');
  });

  test('getFeedback: forwards DB errors to next()', async () => {
    mock.module('../models/Feedback.js', {
      defaultExport: {
        find: () => ({
          sort: () => ({
            limit: () => ({
              select: () => ({
                lean: async () => {
                  throw new Error('Mongo down');
                },
              }),
            }),
          }),
        }),
      },
    });

    const { getFeedback } = await import(
      `../controllers/feedbackController.js?t=${Date.now()}-3`
    );

    let forwardedError = null;
    await getFeedback({}, makeRes(), (err) => {
      forwardedError = err;
    });

    assert.match(forwardedError.message, /Mongo down/);
  });
});
