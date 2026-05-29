import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RideTracker from "@/components/RideTracker";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface BookingData {
  status?: string;
  guestDetails?: Record<string, unknown>;
  vehicle?: {
    name?: string;
    brand?: string;
    model?: string;
    driver?: { name: string; phone?: string; rating?: number; trips?: number };
  };
}

// Terminal states — defined outside the component so they're stable (no exhaustive-deps warning)
const TERMINAL_STATUSES = new Set([
  "driver_rejected", "cancelled", "cancelled_by_customer",
  "cancelled_by_driver", "expired", "completed", "paid",
]);

export default function RideTrackingPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [ridePhase, setRidePhase] = useState("searching");
  const [rideOtp, setRideOtp] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (bookingId) {
      localStorage.setItem("tm_lastVehicleBookingId", bookingId);
    }

    let stopped = false;

    const fetchBooking = async () => {
      try {
        const res = await api.get(`/bookings/${bookingId}`);
        const data = res.data?.data;
        if (!data) throw new Error("Booking not found");

        setBooking(data);
        setRideOtp((data.guestDetails?.otp as string) || null);

        const st = data.status?.toLowerCase();
        if (st === "pending") setRidePhase("searching");
        else if (st === "confirmed" || st === "driver_accepted") setRidePhase("accepted");
        else if (st === "arrived") setRidePhase("arriving");
        else if (st === "in_progress" || st === "ongoing") setRidePhase("in_progress");
        else if (st === "completion_pending_confirmation" || st === "payment_pending") setRidePhase("completion_pending_confirmation");
        else if (st === "completed" || st === "paid") setRidePhase("idle");
        // Terminal rejection / cancellation states
        else if (st === "driver_rejected") setRidePhase("rejected");
        else if (
          st === "cancelled" ||
          st === "cancelled_by_customer" ||
          st === "cancelled_by_driver" ||
          st === "expired"
        ) setRidePhase("cancelled");

        // Stop polling once we hit a terminal state
        if (TERMINAL_STATUSES.has(st ?? "")) {
          stopped = true;
        }

        setLoading(false);
      } catch (err) {
        console.error("Fetch booking error:", err);
        toast.error("Failed to load booking details");
        navigate("/dashboard");
      }
    };

    fetchBooking();
    const interval = setInterval(() => {
      if (!stopped) fetchBooking();
    }, 4000);
    return () => clearInterval(interval);
  }, [bookingId, navigate]);

  // Cancellable states — the backend state machine allows CANCELLED_BY_CUSTOMER
  // from PENDING, DRIVER_ACCEPTED, and ARRIVED only.
  const CANCELLABLE_PHASES = new Set(["searching", "accepted", "arriving"]);

  const handleCancel = async () => {
    // If the ride is already in a non-cancellable state, just navigate away
    if (!CANCELLABLE_PHASES.has(ridePhase)) {
      navigate("/vehicles");
      return;
    }

    if (!window.confirm("Are you sure you want to cancel this ride request?")) return;

    setIsCancelling(true);
    try {
      await api.post(`/bookings/${bookingId}/customer-cancel`, {
        reason: "Cancelled by customer",
      });
      toast.success("Ride request cancelled.");
      navigate("/vehicles");
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? err.message
        : "Failed to cancel. Please try again.";
      toast.error(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmCompletion = async () => {
    try {
      const status = String(booking?.status || "").toLowerCase();

      if (status === "payment_pending") {
        await api.post(`/bookings/${bookingId}/pay`);
        toast.success("Payment confirmed! Ride completed.");
        navigate("/dashboard");
        return;
      }

      await api.post(`/bookings/${bookingId}/confirm-completion`);
      toast.success("Ride confirmed. Proceed to payment.");

      // Refresh in-place so the same button can perform Pay on next tap.
      const latest = await api.get(`/bookings/${bookingId}`);
      const data = latest.data?.data;
      if (data) {
        setBooking(data);
      }
    } catch (err: unknown) {
      console.error("Confirm error:", err);
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const serverMessage = axiosErr?.response?.data?.message || axiosErr?.message || "Failed to confirm. Please try again.";
      toast.error(serverMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  const vehicleNameSafe = booking?.vehicle?.name || [booking?.vehicle?.brand, booking?.vehicle?.model].filter(Boolean).join(" ") || "Vehicle booking";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="w-full min-h-[calc(100vh-12rem)] bg-slate-900 rounded-3xl lg:rounded-[2rem] shadow-2xl overflow-hidden border border-white/5 relative">
          <RideTracker
            phase={ridePhase}
            vehicleName={vehicleNameSafe}
            driverData={booking?.vehicle?.driver}
            otp={rideOtp}
            onCancel={handleCancel}
            isCancelling={isCancelling}
            onConfirm={handleConfirmCompletion}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
