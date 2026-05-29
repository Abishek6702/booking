/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/lib/api";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string; // 'ADMIN' | 'CUSTOMER' | 'OWNER'
  isVerified: boolean;
  ownerStatus?: string; // 'PENDING' | 'APPROVED' | 'REJECTED'
  membershipTier?: string; // 'SILVER' | 'GOLD' | 'PLATINUM'
  avatarUrl?: string | null;
  lifetimeSpend?: number;
  driverStatus?: string; // 'PENDING' | 'APPROVED' | 'REJECTED'
}

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser, tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isOwnerApproved: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoggedIn: false,
  isAdmin: false,
  isOwner: false,
  isOwnerApproved: false,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from /auth/me on mount
  useEffect(() => {
    const hydrate = async () => {
      const token = localStorage.getItem("tm_accessToken");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        if (response.data.success) {
          setUser(response.data.data.user);
        }
      } catch (error) {
        console.error("Session hydration failed:", error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    hydrate();
  }, []);

  const login = (userData: AuthUser, tokens: { accessToken: string; refreshToken: string }) => {
    setUser(userData);
    localStorage.setItem("tm_user", JSON.stringify(userData));
    localStorage.setItem("tm_accessToken", tokens.accessToken);
    localStorage.setItem("tm_refreshToken", tokens.refreshToken);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("tm_refreshToken");
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch (e) {
        console.error("Logout API failed", e);
      }
    }
    setUser(null);
    localStorage.removeItem("tm_user");
    localStorage.removeItem("tm_accessToken");
    localStorage.removeItem("tm_refreshToken");
  };

  const isAdmin = user?.role === "ADMIN";
  const isOwner = user?.role === "OWNER";
  const isOwnerApproved = isOwner && user?.ownerStatus === "APPROVED";

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoggedIn: !!user, 
      isAdmin, 
      isOwner,
      isOwnerApproved,
      isLoading 
    }}>
      {isLoading ? (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
