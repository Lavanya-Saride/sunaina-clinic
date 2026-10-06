import { useCallback, useEffect, useRef, useState } from 'react';
import { getFeedback } from '../services/feedbackService';
import { mergeFeedback } from '../utils/feedbackMerge';
import { createPoller } from '../utils/polling';
import {
  FEEDBACK_POLL_DEFAULT_MS,
  FEEDBACK_POLL_MIN_MS,
  readIntervalMs,
} from '../utils/pollConfig';

const MAX_ITEMS = 50;
const RETRY_START_MS = 10000;

export default function useFeedback() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState('loading');
  const pollerRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const intervalMs = readIntervalMs(import.meta.env.VITE_FEEDBACK_POLL_INTERVAL_MS, {
      fallback: FEEDBACK_POLL_DEFAULT_MS,
      min: FEEDBACK_POLL_MIN_MS,
    });

    const poller = createPoller({
      task: async (signal) => {
        const records = await getFeedback({ signal });
        loadedRef.current = true;
        setData((current) => mergeFeedback(current, records, MAX_ITEMS));
        setStatus('success');
      },
      intervalMs,
      errorIntervalMs: Math.min(RETRY_START_MS, intervalMs || RETRY_START_MS),
      onError: () => {
        if (!loadedRef.current) setStatus('error');
      },
    });

    pollerRef.current = poller;
    poller.start();

    return () => {
      poller.stop();
      pollerRef.current = null;
    };
  }, []);

  const refetch = useCallback(() => {
    if (!loadedRef.current) setStatus('loading');
    return pollerRef.current?.trigger();
  }, []);

  return { data, status, refetch };
}
