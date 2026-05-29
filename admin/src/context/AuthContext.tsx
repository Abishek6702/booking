import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import api from "../lib/api";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: AdminUser | null;
  login: (user: AdminUser, tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
  isLoggedIn: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoggedIn: false,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("admin_refreshToken");
    if (refreshToken) {
      try { await api.post("/auth/logout", { refreshToken }); } catch {}
    }
    setUser(null);
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_accessToken");
    localStorage.removeItem("admin_refreshToken");
  }, []);

  useEffect(() => {
    const hydrate = async () => {
      const token = localStorage.getItem("admin_accessToken");
      if (!token) { setIsLoading(false); return; }
      try {
        const response = await api.get("/auth/me");
        if (response.data.success) {
          const u = response.data.data.user;
          if (u.role !== "ADMIN") { logout(); return; }
          setUser(u);
        }
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    hydrate();
  }, [logout]);

  const login = (userData: AdminUser, tokens: { accessToken: string; refreshToken: string }) => {
    setUser(userData);
    localStorage.setItem("admin_user", JSON.stringify(userData));
    localStorage.setItem("admin_accessToken", tokens.accessToken);
    localStorage.setItem("admin_refreshToken", tokens.refreshToken);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
