import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { getGoogleReviews } from '../services/googleReviewsService';

export default function useGoogleReviews() {
  const [data, setData] = useState(null);
  const [status, setStatus] =
    useState('loading');

  const fetchReviews = useCallback(
    async () => {
      setStatus('loading');

      try {
        const result =
          await getGoogleReviews();

        setData(result);
        setStatus('success');
      } catch (err) {
        setData(null);
        setStatus('error');
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setStatus('loading');

      try {
        const result =
          await getGoogleReviews();

        if (isMounted) {
          setData(result);
          setStatus('success');
        }
      } catch (err) {
        if (isMounted) {
          setData(null);
          setStatus('error');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    data,
    status,
    refetch: fetchReviews,
  };
}