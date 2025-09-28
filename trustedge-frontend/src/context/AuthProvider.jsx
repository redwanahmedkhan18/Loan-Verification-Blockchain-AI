import { createContext, useEffect, useState } from "react";
import { me, logout as apiLogout } from "../api/auth";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  async function refresh() {
    try {
      const u = await me();
      setUser(u);
    } catch (_) {
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => { refresh(); }, []);

  const value = {
    user,
    setUser,
    ready,
    logout: () => { apiLogout(); setUser(null); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
