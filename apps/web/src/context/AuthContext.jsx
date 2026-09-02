import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!getToken()) {
      setUser(null);
      setPermissions([]);
      setLoading(false);
      return;
    }
    try {
      const data = await api('/auth/me');
      setUser(data.user);
      setPermissions(data.permissions || []);
    } catch {
      setToken(null);
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const value = useMemo(() => ({
    user,
    permissions,
    loading,
    can: (code) => permissions.includes('*') || permissions.includes(code),
    async startLogin(email, password) {
      return api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    async verifyLoginOtp(challengeId, otp) {
      const data = await api('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ challenge_id: challengeId, otp }),
      });
      setToken(data.access_token);
      await refresh();
    },
    async resendLoginOtp(challengeId) {
      return api('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ challenge_id: challengeId }),
      });
    },
    logout() {
      setToken(null);
      setUser(null);
      setPermissions([]);
    },
  }), [user, permissions, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
