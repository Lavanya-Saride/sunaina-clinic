import { getGoogleAccessToken } from './googleAuth.js';
import { APPOINTMENT_DURATION_MINUTES, CLINIC_MAPS_URL } from '../config/appointmentConfig.js';
import { getSlotEnd, getSlotStart } from '../utils/appointmentTime.js';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const MEET_POLL_ATTEMPTS = 5;
const MEET_POLL_DELAY_MS = 1000;

function getCalendarId() {
  return process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary';
}

function getEventId(appointment) {
  return `sc${appointment._id.toString()}`;
}

async function calendarRequest(path, options = {}) {
  const accessToken = await getGoogleAccessToken();

  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Google Calendar request failed.');
    error.status = response.status;
    throw error;
  }

  return data;
}

export function extractMeetUrl(event) {
  return (
    event?.hangoutLink ||
    event?.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri ||
    ''
  );
}

function buildEventBody(appointment) {
  const isVirtual = appointment.consultationType === 'virtual';
  const label = isVirtual ? 'Virtual Consultation' : 'Clinic Consultation';
  const start = getSlotStart(appointment.appointmentDate, appointment.timeSlot);
  const end = getSlotEnd(appointment.appointmentDate, appointment.timeSlot, APPOINTMENT_DURATION_MINUTES);

  const body = {
    id: getEventId(appointment),
    summary: `${label} - ${appointment.fullName}`,
    description: `Sunaina Clinic ${label.toLowerCase()}. Appointment No: ${appointment.appointmentNumber}`,
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Kolkata' },
    end: { dateTime: end.toISOString(), timeZone: 'Asia/Kolkata' },
  };

  if (isVirtual) {
    body.attendees = appointment.email ? [{ email: appointment.email }] : [];
    body.conferenceData = {
      createRequest: {
        requestId: `sunaina-${appointment._id.toString()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  } else {
    body.location = CLINIC_MAPS_URL;
  }

  return body;
}

async function fetchEvent(eventId) {
  return calendarRequest(`/calendars/${encodeURIComponent(getCalendarId())}/events/${encodeURIComponent(eventId)}`, {
    method: 'GET',
  });
}

export async function createAppointmentEvent(appointment) {
  const eventId = getEventId(appointment);
  const isVirtual = appointment.consultationType === 'virtual';

  let event;

  try {
    event = await calendarRequest(
      `/calendars/${encodeURIComponent(getCalendarId())}/events?conferenceDataVersion=1&sendUpdates=none`,
      { method: 'POST', body: JSON.stringify(buildEventBody(appointment)) }
    );
  } catch (error) {
    if (error.status !== 409) {
      throw error;
    }
    event = await fetchEvent(eventId);
  }

  let meetUrl = extractMeetUrl(event);

  for (let attempt = 0; isVirtual && !meetUrl && attempt < MEET_POLL_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, MEET_POLL_DELAY_MS));
    event = await fetchEvent(event?.id || eventId);
    meetUrl = extractMeetUrl(event);
  }

  if (isVirtual && !meetUrl) {
    const error = new Error('Google Meet link was not generated.');
    error.eventId = event?.id || eventId;
    throw error;
  }

  return { eventId: event?.id || eventId, meetUrl };
}

export async function cancelAppointmentEvent(eventId) {
  if (!eventId) return;

  try {
    await calendarRequest(
      `/calendars/${encodeURIComponent(getCalendarId())}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
      { method: 'DELETE' }
    );
  } catch (error) {
    if (error.status !== 404 && error.status !== 410) {
      throw error;
    }
  }
}
