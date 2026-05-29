/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Car, Loader2, MapPin, Phone, ShieldCheck, Star, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

type VehicleState = {
  id: string;
  brand?: string;
  model?: string;
  image?: string;
  images?: string[];
  seats?: number;
  capacity?: number;
  rating?: number;
  reviews?: number;
  avgRating?: number;
  totalReviews?: number;
  pricePerKm?: number;
  baseFare?: number;
  location?: string | { address?: string };
  type?: string;
  driver?: {
    name?: string;
    phone?: string;
  };
};

export default function VehicleBookingReviewPage() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();

  const locationState = (location.state || {}) as {
    vehicle?: VehicleState;
    pickup?: string;
    dropoff?: string;
  };

  const [vehicle, setVehicle] = useState<VehicleState | null>(locationState.vehicle || null);
  const [pickup, setPickup] = useState(locationState.pickup || "");
  const [dropoff, setDropoff] = useState(locationState.dropoff || "");
  const [loading, setLoading] = useState(!locationState.vehicle);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    if (!vehicleId) {
      toast.error("Missing vehicle id");
      navigate("/vehicles");
      return;
    }

    const fetchVehicle = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/vehicles/${vehicleId}`);
        const data = res.data?.data;
        if (!data) throw new Error("Vehicle not found");

        setVehicle({
          ...data,
          image: data.images?.[0] || data.image,
          rating: Number(data.avgRating) || 0,
          reviews: data.totalReviews || 0,
          capacity: data.capacity || data.seats || 0,
        });
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to load vehicle details");
        navigate("/vehicles");
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [vehicleId, isLoggedIn, navigate, location.pathname]);

  const estimatedKm = 15;
  const estimatedFare = useMemo(() => {
    const base = Number(vehicle?.baseFare || 0);
    const perKm = Number(vehicle?.pricePerKm || 0);
    return Math.max(base + perKm * estimatedKm, 0);
  }, [vehicle]);

  const confirmHire = async () => {
    if (!vehicle) return;

    try {
      setIsConfirming(true);

      const idempotencyKey = Math.random().toString(36).substring(2, 15);
      const payload = {
        type: "vehicle",
        vehicleId: vehicle.id,
        pickupAddress: pickup.trim(),
        dropoffAddress: dropoff.trim(),
        distance: estimatedKm,
        guests: { adults: 1 },
        checkIn: new Date().toISOString(),
        checkOut: new Date(Date.now() + 60000).toISOString(),
        guestDetails: {
          rider_name: "Customer",
          prefilledDriver: vehicle.driver?.name || null,
        },
      };

      const res = await api.post("/bookings", payload, {
        headers: { "x-idempotency-key": idempotencyKey },
      });

      if (res.data?.data?.id) {
        localStorage.setItem("tm_lastVehicleBookingId", res.data.data.id);
        toast.success("Booking request sent");
        navigate(`/vehicles/track/${res.data.data.id}`);
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to initiate booking";
      toast.error(message);
    } finally {
      setIsConfirming(false);
    }
  };

  if (loading || !vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const driverName = vehicle.driver?.name || "Assigned professional driver";
  const driverPhone = vehicle.driver?.phone || "Phone shared after confirmation";
  const vehicleName = [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
  const vehicleImage =
    vehicle.image ||
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=1200";
  const rating = Number(vehicle.rating || vehicle.avgRating || 0);
  const reviews = Number(vehicle.reviews || vehicle.totalReviews || 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/vehicles")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to vehicles
        </button>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-6">
          <section className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="relative h-72">
              <img src={vehicleImage} alt={vehicleName} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <div className="absolute left-6 bottom-6 text-white">
                <p className="text-[11px] uppercase tracking-[0.25em] font-black text-white/80">Review Before Booking</p>
                <h1 className="text-3xl font-black mt-1">{vehicleName}</h1>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Seats</p>
                  <p className="text-base font-black text-slate-800 mt-1">{vehicle.capacity || vehicle.seats || "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Rating</p>
                  <p className="text-base font-black text-slate-800 mt-1">{rating > 0 ? rating.toFixed(1) : "New"}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Reviews</p>
                  <p className="text-base font-black text-slate-800 mt-1">{reviews.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Price</p>
                  <p className="text-base font-black text-slate-800 mt-1">₹{Number(vehicle.pricePerKm || 0).toLocaleString()}/km</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Driver Details</p>
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary font-black text-lg flex items-center justify-center">
                    {(driverName[0] || "D").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-black text-slate-900 truncate">{driverName}</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>{driverPhone}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        {rating > 0 ? rating.toFixed(1) : "New driver"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        Verified documents
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Trip Details</p>
                <div className="space-y-3">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      placeholder="Enter pickup location"
                      className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      placeholder="Enter drop-off location"
                      className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Fare Summary</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Base fare
                  </span>
                  <span>₹{Number(vehicle.baseFare || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Distance estimate ({estimatedKm} km)
                  </span>
                  <span>₹{(Number(vehicle.pricePerKm || 0) * estimatedKm).toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Estimated total</span>
                  <span className="text-xl font-black text-slate-900">₹{estimatedFare.toLocaleString()}</span>
                </div>
              </div>

              <Button
                onClick={confirmHire}
                disabled={isConfirming || !pickup.trim() || !dropoff.trim()}
                className="w-full mt-5 h-12 rounded-2xl text-xs font-black uppercase tracking-widest"
              >
                {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Booking"}
              </Button>
              <p className="mt-2 text-[11px] text-slate-400">
                You can cancel free of charge until the driver accepts.
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100 rounded-3xl p-5">
              <p className="text-sm font-black text-emerald-700">Why this page first?</p>
              <p className="text-xs text-emerald-700/80 mt-2 leading-relaxed">
                This booking flow now shows all available driver information before you confirm, instead of opening a popup.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
