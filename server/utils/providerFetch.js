export const PROVIDER_TIMEOUT_MS = 15000;

export async function providerFetch(url, options = {}, timeoutMs = PROVIDER_TIMEOUT_MS) {
  try {
    return await fetch(url, { ...options, signal: options.signal ?? AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      const timeout = new Error('Provider request timed out.');
      timeout.status = 504;
      timeout.code = 'PROVIDER_TIMEOUT';
      throw timeout;
    }
    throw error;
  }
}
