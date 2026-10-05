export function installFakeExternalApis() {
  const realFetch = globalThis.fetch;

  const state = {
    events: new Map(),
    emails: [],
    whatsapp: [],
    calendarCalls: [],
    failCalendar: false,
    failGmail: false,
    failWhatsApp: false,
  };

  function json(status, body) {
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function decodeMime(raw) {
    const mime = Buffer.from(raw, 'base64url').toString('utf8');
    const header = (name) => new RegExp(`^${name}: (.*)$`, 'm').exec(mime)?.[1] ?? '';
    const parts = mime.split(/--sc_[0-9a-f]+/).slice(1, 3);
    const decodePart = (part) => {
      const body = part.split(/\r\n\r\n/)[1] || '';
      return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8');
    };
    const subject = header('Subject');
    const encoded = /=\?UTF-8\?B\?(.*)\?=/.exec(subject)?.[1];

    return {
      from: header('From'),
      to: header('To'),
      subject: encoded ? Buffer.from(encoded, 'base64').toString('utf8') : subject,
      text: decodePart(parts[0] || ''),
      html: decodePart(parts[1] || ''),
    };
  }

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = (init.method || 'GET').toUpperCase();

    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      return json(200, { access_token: 'fake-access-token', expires_in: 3600 });
    }

    if (url.startsWith('https://www.googleapis.com/calendar/v3/')) {
      state.calendarCalls.push(`${method} ${url}`);

      if (state.failCalendar) {
        return json(500, { error: { message: 'Calendar unavailable' } });
      }

      const pathname = new URL(url).pathname;
      const eventId = decodeURIComponent(pathname.split('/events/')[1] || '');

      if (method === 'POST') {
        const body = JSON.parse(init.body);
        if (state.events.has(body.id)) {
          return json(409, { error: { message: 'The requested identifier already exists.' } });
        }
        const event = { ...body };
        if (body.conferenceData?.createRequest) {
          event.hangoutLink = `https://meet.google.com/fake-${body.id.slice(-6)}`;
        }
        state.events.set(body.id, event);
        return json(200, event);
      }

      if (method === 'GET') {
        return state.events.has(eventId)
          ? json(200, state.events.get(eventId))
          : json(404, { error: { message: 'Not Found' } });
      }

      if (method === 'DELETE') {
        if (!state.events.has(eventId)) return json(404, { error: { message: 'Not Found' } });
        state.events.delete(eventId);
        return json(204);
      }
    }

    if (url.startsWith('https://gmail.googleapis.com/')) {
      if (state.failGmail) {
        return json(500, { error: { message: 'Gmail unavailable' } });
      }
      state.emails.push(decodeMime(JSON.parse(init.body).raw));
      return json(200, { id: `msg-${state.emails.length}` });
    }

    if (url.startsWith('https://graph.facebook.com/')) {
      if (state.failWhatsApp) {
        return json(400, { error: { message: 'Template not approved' } });
      }
      const body = JSON.parse(init.body);
      state.whatsapp.push({
        to: body.to,
        template: body.template.name,
        parameters: body.template.components[0].parameters.map((p) => p.text),
      });
      return json(200, { messages: [{ id: `wamid-${state.whatsapp.length}` }] });
    }

    return realFetch(input, init);
  };

  return {
    state,
    reset() {
      state.events.clear();
      state.emails.length = 0;
      state.whatsapp.length = 0;
      state.calendarCalls.length = 0;
      state.failCalendar = false;
      state.failGmail = false;
      state.failWhatsApp = false;
    },
    restore() {
      globalThis.fetch = realFetch;
    },
  };
}
