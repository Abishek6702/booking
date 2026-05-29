import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { AuthProvider } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { BookingProvider } from "./context/BookingContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import OtpVerification from "./pages/auth/OtpVerification";
import ForgotPassword from "./pages/auth/ForgotPassword";
import SearchResults from "./pages/property/SearchResults";
import Stay from "./pages/property/Stay";
import StayDetails from "./pages/property/StayDetails";
import BookingPage from "./pages/booking/BookingPage";
import PaymentPage from "./pages/booking/PaymentPage";
import ConfirmationPage from "./pages/booking/ConfirmationPage";
import BookingDetailsPage from "./pages/booking/BookingDetailsPage";
import VehicleBooking from "./pages/VehicleBooking";
import Attractions from "./pages/attractions/Attractions";
import AttractionDetails from "./pages/attractions/AttractionDetails";
import Dashboard from "./pages/dashboard/Dashboard";
import OwnerLogin from "./pages/owner/OwnerLogin";
import OwnerSignup from "./pages/owner/OwnerSignup";
import OwnerForgotPassword from "./pages/owner/OwnerForgotPassword";
import OwnerVerification from "./pages/owner/OwnerVerification";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerAnalytics from "./pages/owner/OwnerAnalytics";
import OwnerBookings from "./pages/owner/OwnerBookings";
import OwnerProperties from "./pages/owner/OwnerProperties";
import OwnerRooms from "./pages/owner/OwnerRooms";
import OwnerReviews from "./pages/owner/OwnerReviews";
import OwnerPendingApproval from "./pages/owner/OwnerPendingApproval";
import SupportTickets from "./pages/dashboard/SupportTickets";
import RideTrackingPage from "./pages/RideTrackingPage";
import VehicleBookingReviewPage from "./pages/VehicleBookingReviewPage";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <AuthProvider>
          <FavoritesProvider>
            <BookingProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/verify-otp" element={<OtpVerification />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/stay" element={<Stay />} />
                <Route path="/stay-details/:id" element={<StayDetails />} />
                <Route path="/booking" element={<BookingPage />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/confirmation" element={<ConfirmationPage />} />
                <Route
                  path="/booking-details/:bookingId"
                  element={
                    <ProtectedRoute>
                      <BookingDetailsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/vehicles" element={<VehicleBooking />} />
                <Route path="/vehicles/review/:vehicleId" element={<VehicleBookingReviewPage />} />
                <Route path="/vehicles/track/:bookingId" element={<RideTrackingPage />} />
                <Route path="/attractions" element={<Attractions />} />
                <Route path="/attraction/:id" element={<AttractionDetails />} />

                {/* Protected route — requires login */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/support"
                  element={
                    <ProtectedRoute>
                      <SupportTickets />
                    </ProtectedRoute>
                  }
                />

                {/* Owner portal */}
                <Route path="/owner/login" element={<OwnerLogin />} />
                <Route path="/owner/signup" element={<OwnerSignup />} />
                <Route path="/owner/forgot-password" element={<OwnerForgotPassword />} />
                <Route path="/owner/verification" element={<OwnerVerification />} />
                <Route path="/owner/pending" element={<OwnerPendingApproval />} />
                
                <Route 
                  path="/owner/dashboard" 
                  element={<ProtectedRoute requiredRole="OWNER"><OwnerDashboard /></ProtectedRoute>} 
                />
                <Route 
                  path="/owner/analytics" 
                  element={<ProtectedRoute requiredRole="OWNER"><OwnerAnalytics /></ProtectedRoute>} 
                />
                <Route 
                  path="/owner/bookings" 
                  element={<ProtectedRoute requiredRole="OWNER"><OwnerBookings /></ProtectedRoute>} 
                />
                <Route 
                  path="/owner/properties" 
                  element={<ProtectedRoute requiredRole="OWNER"><OwnerProperties /></ProtectedRoute>} 
                />
                <Route 
                  path="/owner/rooms" 
                  element={<ProtectedRoute requiredRole="OWNER"><OwnerRooms /></ProtectedRoute>} 
                />
                <Route 
                  path="/owner/reviews" 
                  element={<ProtectedRoute requiredRole="OWNER"><OwnerReviews /></ProtectedRoute>} 
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BookingProvider>
          </FavoritesProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
