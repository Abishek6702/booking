import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminStays from "./pages/AdminStays";
import AdminVehicles from "./pages/AdminVehicles";
import AdminBookings from "./pages/AdminBookings";
import AdminAttractions from "./pages/AdminAttractions";
import AdminSupport from "./pages/AdminSupport";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user } = useAuth();
  if (!isLoggedIn || user?.role !== "ADMIN") return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/login" element={<Login mode="login" />} />
        <Route path="/register" element={<Login mode="register" />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path="/stays" element={<ProtectedRoute><AdminStays /></ProtectedRoute>} />
        <Route path="/vehicles" element={<ProtectedRoute><AdminVehicles /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><AdminBookings /></ProtectedRoute>} />
        <Route path="/attractions" element={<ProtectedRoute><AdminAttractions /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><AdminSupport /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
