import { useCallback, useEffect, useRef, useState } from 'react';
import { getBookedSlots } from '../services/appointmentService';
import { createPoller } from '../utils/polling';
import { SLOT_REFRESH_MS, SLOT_RETRY_MS } from '../utils/pollConfig';

export default function useBookedSlots(date, { enabled = true, validSlots, onLoaded } = {}) {
  const [state, setState] = useState({ date: '', slots: [], status: 'idle' });
  const onLoadedRef = useRef(onLoaded);
  const validRef = useRef(validSlots);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
    validRef.current = validSlots;
  });

  useEffect(() => {
    if (!date || !enabled) return undefined;

    const poller = createPoller({
      task: async (signal) => {
        const fetched = await getBookedSlots(date, { signal });
        const valid = validRef.current ? fetched.filter((slot) => validRef.current.includes(slot)) : fetched;
        setState({ date, slots: valid, status: 'ready' });
        onLoadedRef.current?.(valid);
      },
      intervalMs: SLOT_REFRESH_MS,
      errorIntervalMs: SLOT_RETRY_MS,
      onError: () => {
        setState((current) =>
          current.date === date && current.status === 'ready' ? current : { date, slots: [], status: 'error' }
        );
      },
    });

    poller.start();

    return () => poller.stop();
  }, [date, enabled]);

  const markBooked = useCallback(
    (slot) => {
      setState((current) =>
        current.date === date && !current.slots.includes(slot)
          ? { ...current, slots: [...current.slots, slot] }
          : current
      );
    },
    [date]
  );

  const active = Boolean(date) && enabled;
  const view = state.date === date && active ? state : { slots: [], status: active ? 'loading' : 'idle' };

  return { slots: view.slots, status: view.status, markBooked };
}
