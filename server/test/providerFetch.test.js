import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { providerFetch } from '../utils/providerFetch.js';

describe('provider calls are bounded in time', () => {
  let server;
  let base;

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/ok') {
        res.setHeader('Content-Type', 'application/json');
        res.end('{"ok":true}');
      }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  test('a stalled provider is cut off and reported as an ambiguous timeout', async () => {
    const started = Date.now();
    await assert.rejects(
      () => providerFetch(`${base}/stall`, {}, 150),
      (error) => error.code === 'PROVIDER_TIMEOUT' && error.status === 504 && /timed out/.test(error.message)
    );
    assert.ok(Date.now() - started < 2000);
  });

  test('a prompt response is returned unchanged', async () => {
    const response = await providerFetch(`${base}/ok`, {}, 1000);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });

  test('network errors that are not timeouts pass through', async () => {
    await assert.rejects(() => providerFetch('http://127.0.0.1:1/', {}, 1000), (error) => error.code !== 'PROVIDER_TIMEOUT');
  });
});
