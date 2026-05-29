/* eslint-disable @typescript-eslint/no-explicit-any */
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  MapPin, Search, Star as StarIcon, Clock, Users, Shield,
  Gauge, ArrowRight, Car, Bike, X as CloseIcon, ReceiptText,
  SlidersHorizontal as FilterIcon, Grid3X3, List, CheckCircle2 as VerifiedIcon,
  Fuel, Navigation, Heart, TrendingUp, Sparkles,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import api from "@/lib/api";

// ─── Data ─────────────────────────────────────────────────────────────────────

const VEHICLE_TYPES = [
  { label: "All", value: "all", icon: Grid3X3 },
  { label: "Car", value: "car", icon: Car },
  { label: "Bike", value: "bike", icon: Bike },
];

const SEAT_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "2+", value: 2 },
  { label: "4+", value: 4 },
  { label: "7+", value: 7 },
];

const TYPE_COLORS: Record<string, string> = {
  car: "bg-blue-50 text-blue-600 border-blue-100",
  bike: "bg-orange-50 text-orange-600 border-orange-100",
};

// ─── Vehicle Card ──────────────────────────────────────────────────────────────

const VCard = ({
  vehicle, isFav, onFav, viewMode, onBook,
}: {
  vehicle: any;
  isFav: boolean;
  onFav: () => void;
  viewMode: "grid" | "list";
  onBook: () => void;
}) => {
  const typeKey = String(vehicle.type || "").toLowerCase();
  const typeColor = TYPE_COLORS[typeKey] || "bg-gray-100 text-gray-600 border-gray-200";
  const vehicleImage = vehicle.image || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400";

  if (viewMode === "grid") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group will-change-transform isolate">
        <div className="relative h-44 overflow-hidden rounded-t-2xl">
          <img src={vehicleImage} alt={vehicle.model} className="w-full h-full object-cover scale-[1.02] group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <button onClick={(e) => { e.stopPropagation(); onFav(); }} className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl hover:bg-white transition-all shadow-sm">
            <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
          </button>
          <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border capitalize ${typeColor}`}>
            {typeKey}
          </div>
        </div>

        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">{vehicle.brand} {vehicle.model}</h3>
              {vehicle.location && <p className="text-[11px] text-gray-400 mt-0.5">{typeof vehicle.location === 'string' ? vehicle.location : vehicle.location.address || "Available Now"}</p>}
            </div>
            <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-lg flex-shrink-0">
              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-gray-900">{vehicle.rating || "New"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 my-2.5">
            {typeKey !== "bike" && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500"><Users className="h-3 w-3 text-primary" /> {vehicle.capacity || vehicle.seats} seats</span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-gray-500"><Fuel className="h-3 w-3 text-primary" /> Fuel incl.</span>
            <span className="flex items-center gap-1 text-[11px] text-gray-500"><Gauge className="h-3 w-3 text-primary" /> AC</span>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {(vehicle.tags || []).slice(0, 2).map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-[10px] font-medium border border-gray-100">{tag}</span>
            ))}
          </div>

          <div className="flex items-end justify-between pt-2.5 border-t border-gray-50">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-gray-900">₹{(vehicle.pricePerKm || 12).toLocaleString()}</span>
                <span className="text-[10px] text-gray-400">/km</span>
              </div>
              <p className="text-[10px] text-gray-400">{vehicle.reviews || 0} reviews</p>
            </div>
            <Button size="sm" onClick={onBook} className="h-7 px-3 rounded-xl text-[11px] font-semibold shadow-sm shadow-primary/20">
              Hire <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group flex will-change-transform isolate">
      <div className="relative w-48 flex-shrink-0 overflow-hidden rounded-l-2xl">
        <img src={vehicleImage} alt={vehicle.model} className="w-full h-full object-cover scale-[1.02] group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <button onClick={(e) => { e.stopPropagation(); onFav(); }} className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl hover:bg-white transition-all shadow-sm">
          <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
        </button>
        <div className={`absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border capitalize ${typeColor}`}>
          {typeKey}
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">{vehicle.brand} {vehicle.model}</h3>
              {vehicle.location && <p className="text-[11px] text-gray-400 mt-0.5">{typeof vehicle.location === 'string' ? vehicle.location : vehicle.location.address || "Available Now"}</p>}
            </div>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg flex-shrink-0">
              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-gray-900">{vehicle.rating || "New"}</span>
              <span className="text-[10px] text-gray-400">({vehicle.reviews || 0})</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 mb-3">
            {typeKey !== "bike" && (
              <span className="flex items-center gap-1.5 text-[11px] text-gray-500"><Users className="h-3.5 w-3.5 text-primary" /> {vehicle.capacity || vehicle.seats} seats</span>
            )}
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500"><Fuel className="h-3.5 w-3.5 text-primary" /> Fuel included</span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500"><Gauge className="h-3.5 w-3.5 text-primary" /> AC / GPS</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(vehicle.tags || []).map((tag: string) => (
              <span key={tag} className="px-2.5 py-0.5 bg-gray-50 text-gray-500 rounded-full text-[11px] font-medium border border-gray-100">{tag}</span>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between pt-2.5 border-t border-gray-50 mt-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-gray-900">₹{(vehicle.pricePerKm || 12).toLocaleString()}</span>
              <span className="text-[11px] text-gray-400">/km</span>
            </div>
            <p className="text-[11px] text-primary font-medium">Driver included</p>
          </div>
          <Button size="sm" onClick={onBook} className="h-8 px-4 rounded-xl text-xs font-semibold shadow-sm shadow-primary/20">
            Hire Now <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

const VehicleBooking = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Cities
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  useEffect(() => {
    const fetchCities = async () => {
      try {
        setCitiesLoading(true);
        const res = await api.get("/vehicles/available-cities");
        const data: string[] = res.data?.data ?? [];
        setCities(data);
      } catch (err) {
        console.error("Failed to fetch cities:", err);
      } finally {
        setCitiesLoading(false);
      }
    };
    fetchCities();
  }, []);
  const [vehicleType, setVehicleType] = useState("all");
  const [pricePerKmRange, setPricePerKmRange] = useState([0, 6000]);
  const [minSeats, setMinSeats] = useState(0);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const { isFavorite, toggleFavorite } = useFavorites();
  const [activeRideBooking, setActiveRideBooking] = useState<any | null>(null);
  const [lastTrackedBookingId, setLastTrackedBookingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (selectedCity) params.city = selectedCity;
        if (searchQuery) params.q = searchQuery;
        if (vehicleType !== "all") params.type = vehicleType;
        if (minSeats > 0) params.minSeats = minSeats;
        if (pricePerKmRange[0] > 0) params.minPricePerKm = pricePerKmRange[0];
        if (pricePerKmRange[1] < 6000) params.maxPricePerKm = pricePerKmRange[1];

        const res = await api.get("/vehicles/search", { params });
        const data = res.data?.data?.vehicles || res.data?.data || [];
        setVehicles(data);
      } catch {
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchVehicles, 500);
    return () => clearTimeout(timer);
  }, [selectedCity, searchQuery, vehicleType, minSeats, pricePerKmRange]);

  // Restore active ride on mount
  useEffect(() => {
    if (!isLoggedIn) {
      setActiveRideBooking(null);
      return;
    }

    const lastId = localStorage.getItem("tm_lastVehicleBookingId");
    setLastTrackedBookingId(lastId);

    const restoreRide = async () => {
      try {
        const res = await api.get("/bookings");
        const bookings = Array.isArray(res.data?.data) ? res.data.data : [];
        const activeRide = bookings.find((b: any) =>
          b.type === "vehicle" &&
          [
            "pending",
            "confirmed",
            "driver_accepted",
            "arrived",
            "in_progress",
            "ongoing",
            "completion_pending_confirmation",
            "payment_pending",
          ].includes(String(b.status || "").toLowerCase())
        );

        if (activeRide) {
          setActiveRideBooking(activeRide);
          localStorage.setItem("tm_lastVehicleBookingId", activeRide.id);
          setLastTrackedBookingId(activeRide.id);
        } else {
          setActiveRideBooking(null);
        }
      } catch (err) {
        console.error("Failed to restore ride:", err);
      }
    };
    restoreRide();
  }, [isLoggedIn]);



  const displayVehicles = useMemo(() => {
    let list = [...vehicles];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(v => {
        const brand = String(v.brand || "").toLowerCase();
        const model = String(v.model || "").toLowerCase();
        const loc = typeof v.location === 'string' 
          ? v.location.toLowerCase() 
          : String(v.location?.address || "").toLowerCase();
        return brand.includes(q) || model.includes(q) || loc.includes(q);
      });
    }
    if (vehicleType !== "all") {
      list = list.filter(v => String(v.type || "").toLowerCase() === vehicleType.toLowerCase());
    }
    if (minSeats > 0) {
      list = list.filter(v => (Number(v.capacity) || Number(v.seats) || 0) >= minSeats);
    }
    list = list.filter(v => {
      const p = Number(v.pricePerKm) || 0;
      return p >= pricePerKmRange[0] && p <= pricePerKmRange[1];
    });
    return list;
  }, [vehicles, searchQuery, vehicleType, minSeats, pricePerKmRange]);

  const clearAll = () => {
    setSearchQuery("");
    setSelectedCity("");
    setVehicleType("all");
    setPricePerKmRange([0, 6000]);
    setMinSeats(0);
  };

  const handleBook = (vehicle: any) => {
    if (!isLoggedIn) { navigate("/login", { state: { from: "/vehicles" } }); return; }
    // Only pass pickup/dropoff if they were explicitly entered in the route planner,
    // not if pickup just happens to match the selected city name
    const cleanPickup = pickup.trim().toLowerCase() === selectedCity.trim().toLowerCase() ? "" : pickup;
    navigate(`/vehicles/review/${vehicle.id}`, {
      state: {
        vehicle,
        pickup: cleanPickup,
        dropoff,
      },
    });
  };

  const handleToggleVehicleFav = (v: any) =>
    toggleFavorite({
      id: v.id,
      title: `${v.brand || ""} ${v.model || ""}`.trim() || "Vehicle",
      image: v.image || (Array.isArray(v.images) ? v.images[0] : "") || "",
      location: typeof v.location === "string"
        ? v.location
        : (v.location?.address || v.city || "Available now"),
      rating: Number(v.rating ?? v.avgRating ?? 0),
      reviews: Number(v.reviews ?? v.totalReviews ?? 0),
      price: Number(v.pricePerKm ?? 0),
      amenities: v.tags || [],
      type: String(v.type || "CAR").toUpperCase(),
      cancellable: true,
    });

  const activeFiltersCount =
    (vehicleType !== "all" ? 1 : 0) +
    (pricePerKmRange[0] > 0 || pricePerKmRange[1] < 6000 ? 1 : 0) +
    (minSeats > 0 ? 1 : 0);



  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-5">
        {isLoggedIn && (activeRideBooking || lastTrackedBookingId) && (
          <div className="mb-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Current Driver Request</p>
              <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                {activeRideBooking
                  ? `${activeRideBooking.vehicle?.brand || "Vehicle"} ${activeRideBooking.vehicle?.model || ""} · ${String(activeRideBooking.status || "pending").replaceAll("_", " ")}`
                  : "Resume your latest submitted request"}
              </p>
            </div>
            <Button
              onClick={() => navigate(`/vehicles/track/${activeRideBooking?.id || lastTrackedBookingId}`)}
              className="h-10 rounded-xl text-xs font-black uppercase tracking-widest"
            >
              <ReceiptText className="h-4 w-4 mr-2" />
              View Request
            </Button>
          </div>
        )}

        <div className="flex gap-5">

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <aside className={`w-60 flex-shrink-0 ${showMobileFilters ? "block" : "hidden"} lg:block`}>
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 space-y-3">

              {/* Filters */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FilterIcon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-bold text-gray-900">Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFiltersCount}</span>
                    )}
                  </div>
                  <button onClick={clearAll} className="text-xs text-primary font-medium flex items-center gap-1">
                    <CloseIcon className="h-3 w-3" /> Clear
                  </button>
                </div>

              {/* City selector */}
                <div className="mb-4">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">City</p>
                  {citiesLoading ? (
                    <p className="text-xs text-gray-400 py-2">Loading available cities...</p>
                  ) : cities.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No drivers available right now.</p>
                  ) : (
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select your city</option>
                      {cities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Price/km */}
                <div className="mb-4">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Price / km</p>
                  <div className="bg-gray-50 rounded-xl p-3 mb-2">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-gray-900">₹{pricePerKmRange[0]}</span>
                      <span className="text-sm font-bold text-gray-900">₹{pricePerKmRange[1]}</span>
                    </div>
                    <Slider value={pricePerKmRange} min={0} max={6000} step={100} onValueChange={setPricePerKmRange} />
                  </div>
                </div>

                {/* Seats */}
                {vehicleType !== "bike" && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Minimum Seats</p>
                    <div className="flex gap-2 flex-wrap">
                      {SEAT_OPTIONS.map(({ label, value }) => (
                        <button
                          key={value}
                          onClick={() => setMinSeats(value)}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${minSeats === value ? "bg-primary/10 text-primary border-primary/20" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vehicle type */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Vehicle Type</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VEHICLE_TYPES.map(({ label, value, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setVehicleType(value);
                          if (value === "bike" && minSeats > 0) setMinSeats(0);
                        }}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${vehicleType === value ? "bg-primary/5 border-primary/25 text-primary" : "border-gray-100 text-gray-500 hover:bg-gray-50"}`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Route planner */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="h-3.5 w-3.5 text-primary" />
                  <p className="text-sm font-bold text-gray-900">Plan Route</p>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                    <Input value={pickup} onChange={e => setPickup(e.target.value)} placeholder="Pickup location" className="h-9 pl-8 rounded-xl bg-gray-50 border-gray-200 text-xs" />
                  </div>

                </div>
              </div>

              {/* Trust badge */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <VerifiedIcon className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-700">Verified Drivers</span>
                </div>
                <p className="text-[11px] text-emerald-600 leading-relaxed">All drivers are background-checked and licensed.</p>
              </div>
            </div>
          </aside>

          {/* ── Main Content ───────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {selectedCity ? `Drivers in ${selectedCity}` : "Available Drivers"}
                  </h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {loading
                      ? "Loading fleet..."
                      : `${displayVehicles.length} vehicle${displayVehicles.length !== 1 ? "s" : ""} available${selectedCity ? ` in ${selectedCity}` : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-gray-400 hidden sm:block">Driver included</span>
                </div>
              </div>

              {/* City selector bar (mobile-friendly, always visible) */}
              <div className="mb-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  {citiesLoading ? (
                    <span className="text-xs text-gray-400">Loading cities...</span>
                  ) : cities.length === 0 ? (
                    <span className="text-xs text-gray-400">No drivers available right now.</span>
                  ) : (
                    cities.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedCity(c)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                          selectedCity === c
                            ? "bg-primary text-white shadow-sm shadow-primary/25"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-primary/30"
                        }`}
                      >
                        {c}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Type tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {VEHICLE_TYPES.map(({ label, value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setVehicleType(value);
                      if (value === "Bike" && minSeats > 2) setMinSeats(0);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${vehicleType === value ? "bg-primary text-white shadow-sm shadow-primary/25" : "bg-white border border-gray-200 text-gray-600 hover:border-primary/30"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Grid */}
            {loading ? (
              <div className={`grid gap-3 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className={`bg-gray-100 ${viewMode === "grid" ? "h-44" : "h-32"}`} />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-50 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayVehicles.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Car className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                {selectedCity ? (
                  <>
                    <p className="text-gray-600 font-semibold">No drivers online in {selectedCity} right now</p>
                    <p className="text-sm text-gray-400 mt-1">Try a different city or check back soon</p>
                    <Button variant="outline" onClick={() => setSelectedCity("")} className="mt-4 rounded-xl text-xs h-9">Show all cities</Button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 font-semibold">No drivers online right now</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or check back soon</p>
                    <Button variant="outline" onClick={clearAll} className="mt-4 rounded-xl text-xs h-9">Clear Filters</Button>
                  </>
                )}
              </div>
            ) : (
              <div className={`grid gap-3 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                {displayVehicles.map(v => (
                  <VCard
                    key={v.id}
                    vehicle={v}
                    isFav={isFavorite(v.id)}
                    onFav={() => handleToggleVehicleFav(v)}
                    viewMode={viewMode}
                    onBook={() => handleBook(v)}
                  />
                ))}
              </div>
            )}

            {/* Trending cities */}
            {!loading && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-bold text-gray-900">Popular Destinations</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { name: "Bali", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400", count: "28 vehicles" },
                    { name: "Dubai", img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400", count: "41 vehicles" },
                    { name: "Goa", img: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=400", count: "19 vehicles" },
                    { name: "Manali", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=400", count: "14 vehicles" },
                  ].map(dest => (
                    <button
                      key={dest.name}
                      onClick={() => setSearchQuery(dest.name)}
                      className="relative rounded-xl overflow-hidden h-24 group text-left"
                    >
                      <img src={dest.img} alt={dest.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-2.5">
                        <p className="text-white font-bold text-sm">{dest.name}</p>
                        <p className="text-white/70 text-[11px]">{dest.count}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Why book */}
            {!loading && (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Shield, label: "Verified Drivers", desc: "Background checked" },
                  { icon: Fuel, label: "Fuel Included", desc: "No hidden charges" },
                  { icon: Clock, label: "24/7 Support", desc: "Always available" },
                  { icon: Sparkles, label: "Best Price", desc: "Price match promise" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 flex gap-3 items-start shadow-sm">
                    <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VehicleBooking;
