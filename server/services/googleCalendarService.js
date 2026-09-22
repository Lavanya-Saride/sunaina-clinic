function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary';

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Calendar credentials are not fully configured.');
  }

  return { clientId, clientSecret, refreshToken, calendarId };
}

async function getAccessToken() {
  const { clientId, clientSecret, refreshToken } = getGoogleConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || 'Unable to authenticate with Google.');
  }

  return data.access_token;
}

function getDateTime(date, time, addMinutes = 0) {
  const [clock, period] = time.split(' ');
  const [hourValue, minuteValue] = clock.split(':').map(Number);
  let hour = hourValue;

  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  const base = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')}:00+05:30`);
  base.setMinutes(base.getMinutes() + addMinutes);
  return base.toISOString();
}

async function calendarRequest(path, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Google Calendar request failed.');
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function createVirtualConsultation({ appointment }) {
  const { calendarId } = getGoogleConfig();
  const start = getDateTime(appointment.appointmentDate, appointment.timeSlot);
  const end = getDateTime(appointment.appointmentDate, appointment.timeSlot, 30);
  const requestId = `sunaina-${appointment._id.toString()}-${Date.now()}`;
  const event = await calendarRequest(`/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=none`, {
    method: 'POST',
    body: JSON.stringify({
      summary: `Virtual Consultation - ${appointment.fullName}`,
      description: `Sunaina Clinic virtual consultation for ${appointment.fullName}. Appointment ID: ${appointment._id}`,
      start: {
        dateTime: start,
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: end,
        timeZone: 'Asia/Kolkata',
      },
      attendees: appointment.email ? [{ email: appointment.email }] : [],
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    }),
  });

  let meetUrl = extractMeetUrl(event);

  for (let attempt = 0; !meetUrl && attempt < 5; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const refreshed = await calendarRequest(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.id)}`, {
      method: 'GET',
    });
    meetUrl = extractMeetUrl(refreshed);
    if (meetUrl) return refreshed;
  }

  return event;
}

export function extractMeetUrl(event) {
  return event?.hangoutLink || event?.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri || '';
}
