import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthContext from './authContextObject';
import {
  clearSession,
  fetchCurrentUser,
  getStoredSession,
  login as loginRequest,
  logout as logoutRequest,
  setUnauthorizedHandler,
  storeSession,
} from '../services/dashboardService';

const MAX_TIMEOUT_MS = 2147483647;

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => {
    const session = getStoredSession();
    return session
      ? { status: 'loading', user: session.user, expiresAt: session.expiresAt, notice: '' }
      : { status: 'anonymous', user: null, expiresAt: null, notice: '' };
  });

  const expireSession = useCallback(() => {
    clearSession();
    setState({ status: 'anonymous', user: null, expiresAt: null, notice: 'Your session has ended. Please sign in again.' });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(expireSession);
    return () => setUnauthorizedHandler(null);
  }, [expireSession]);

  useEffect(() => {
    if (state.status !== 'loading') return undefined;
    let active = true;

    fetchCurrentUser()
      .then((data) => {
        if (!active) return;
        const session = getStoredSession();
        if (session) storeSession({ ...session, user: data.user });
        setState({ status: 'authenticated', user: data.user, expiresAt: data.expiresAt, notice: '' });
      })
      .catch((error) => {
        if (!active || error.response?.status === 401) return;
        clearSession();
        setState({ status: 'anonymous', user: null, expiresAt: null, notice: 'Unable to reach the server. Please try again.' });
      });

    return () => {
      active = false;
    };
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !state.expiresAt) return undefined;
    const remaining = new Date(state.expiresAt).getTime() - Date.now();
    const timer = setTimeout(expireSession, Math.min(Math.max(remaining, 0), MAX_TIMEOUT_MS));
    return () => clearTimeout(timer);
  }, [state.status, state.expiresAt, expireSession]);

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    storeSession({ token: data.token, expiresAt: data.expiresAt, user: data.user });
    setState({ status: 'authenticated', user: data.user, expiresAt: data.expiresAt, notice: '' });
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      clearSession();
    }
    setState({ status: 'anonymous', user: null, expiresAt: null, notice: '' });
  }, []);

  const value = useMemo(() => {
    const permissions = state.user?.permissions || [];
    return {
      status: state.status,
      user: state.user,
      notice: state.notice,
      can: (permission) => permissions.includes(permission),
      login,
      logout,
    };
  }, [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
