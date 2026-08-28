import { useCallback, useEffect, useState } from 'react';
import { getFeedback } from '../services/feedbackService';

export default function useFeedback() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState('loading');

  const fetchFeedback = useCallback(async () => {
    setStatus('loading');
    try {
      const records = await getFeedback();
      setData(Array.isArray(records) ? records : []);
      setStatus('success');
    } catch (err) {
      setData([]);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setStatus('loading');
      try {
        const records = await getFeedback();
        if (isMounted) {
          setData(Array.isArray(records) ? records : []);
          setStatus('success');
        }
      } catch (err) {
        if (isMounted) {
          setData([]);
          setStatus('error');
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return { data, status, refetch: fetchFeedback };
}
