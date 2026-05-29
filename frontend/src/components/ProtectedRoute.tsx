import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "CUSTOMER" | "OWNER" | "ADMIN";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isLoggedIn, user, isOwnerApproved, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isLoggedIn) {
    const loginPath = location.pathname.startsWith("/owner") ? "/owner/login" : "/login";
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  // Owner trying to access owner portal pages — must be admin-approved first
  if (requiredRole === "OWNER" && user?.role === "OWNER" && !isOwnerApproved) {
    return <Navigate to="/owner/pending" replace />;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== "ADMIN") {
    // Wrong role → redirect to their own home
    const homePath = user?.role === "OWNER" ? "/owner/dashboard" : "/dashboard";
    return <Navigate to={homePath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
