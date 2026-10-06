import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { getFeedbackUrl } from '../services/appointmentWorkflow.js';
import { isOptOutText } from '../controllers/whatsappWebhookController.js';
import { isMainModule } from '../server.js';

const ORIGINAL = process.env.CLIENT_URL;

describe('feedback link base URL', () => {
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = ORIGINAL;
  });

  test('skips localhost entries so the .env.example ordering cannot leak into patient messages', () => {
    process.env.CLIENT_URL = 'http://localhost:5173,https://clinic.example';
    assert.equal(getFeedbackUrl(), 'https://clinic.example/feedback');
    process.env.CLIENT_URL = 'http://127.0.0.1:5173, https://clinic.example/ ,https://other.example';
    assert.equal(getFeedbackUrl(), 'https://clinic.example/feedback');
  });

  test('uses the only configured origin, even if it is local, and falls back when unset', () => {
    process.env.CLIENT_URL = 'http://localhost:5173';
    assert.equal(getFeedbackUrl(), 'http://localhost:5173/feedback');
    delete process.env.CLIENT_URL;
    assert.match(getFeedbackUrl(), /^https:\/\/.+\/feedback$/);
  });
});

describe('WhatsApp STOP detection', () => {
  test('accepts the keywords regardless of case, punctuation and spacing', () => {
    for (const text of ['STOP', 'stop', 'Stop.', ' stop!! ', 'Stop all', 'STOP  ALL', 'unsubscribe', 'StopAll']) {
      assert.equal(isOptOutText(text), true, text);
    }
  });

  test('does not treat ordinary messages as opt-out', () => {
    for (const text of ['please do not stop the reminders', 'stopping by tomorrow', 'yes', '', undefined, null]) {
      assert.equal(isOptOutText(text), false, String(text));
    }
  });
});

describe('entrypoint detection', () => {
  test('matches a path containing spaces and characters that are percent-encoded in file URLs', () => {
    const path = '/srv/my app/clinic #1/server.js';
    assert.equal(isMainModule(pathToFileURL(path).href, path), true);
    assert.equal(`file://${path}` === pathToFileURL(path).href, false);
  });

  test('does not match another file or a missing entry path', () => {
    assert.equal(isMainModule(pathToFileURL('/a/server.js').href, '/a/other.js'), false);
    assert.equal(isMainModule(pathToFileURL('/a/server.js').href, undefined), false);
  });
});
