/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import AttractionCard from "@/components/AttractionCard";
import VehicleCard from "@/components/VehicleCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  SlidersHorizontal as FilterIcon,
  X as CloseIcon,
  Search as SearchIcon,
  Star as StarIcon,
  CheckCircle2 as VerifiedIcon,
  MapPin,
  Grid3X3,
  List,
  Sparkles,
  Building2,
  Home,
  Waves,
  Leaf,
  Wifi,
  Car,
  Ticket,
  Users,
  TrendingUp,
  Mountain,
  TreePine,
  Compass,
  Camera,
  Utensils,
  Music,
} from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import api from "@/lib/api";
import { matchVibe } from "@/utils/vibeMatcher";

// ─── Types ───────────────────────────────────────────────────────────────────

type SearchTab = "hotels" | "attractions" | "vehicles";

const getTabFromCategory = (category: string | null): SearchTab => {
  const normalized = category?.toLowerCase();
  if (normalized === "vehicles" || normalized === "vehicle") return "vehicles";
  if (normalized === "attractions" || normalized === "attraction") return "attractions";
  return "hotels";
};

// ─── Sample data ─────────────────────────────────────────────────────────────

// ─── Constants ────────────────────────────────────────────────────────────────

const STAR_LEVELS = [5, 4, 3, 2, 1];

const HOTEL_TYPES = [
  { label: "All", value: "all", icon: Grid3X3 },
  { label: "Hotels", value: "HOTEL", icon: Building2 },
  { label: "Resorts", value: "RESORT", icon: Waves },
  { label: "Apartments", value: "APARTMENT", icon: Home },
  { label: "Villas", value: "VILLA", icon: Leaf },
];

const CATEGORIES = [
  { icon: Waves, label: "Beach", color: "bg-sky-50 text-sky-600 border-sky-100" },
  { icon: Mountain, label: "Mountains", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { icon: Building2, label: "City", color: "bg-violet-50 text-violet-600 border-violet-100" },
  { icon: TreePine, label: "Nature", color: "bg-lime-50 text-lime-600 border-lime-100" },
  { icon: Compass, label: "Adventure", color: "bg-orange-50 text-orange-600 border-orange-100" },
  { icon: Camera, label: "Cultural", color: "bg-rose-50 text-rose-600 border-rose-100" },
  { icon: Utensils, label: "Culinary", color: "bg-amber-50 text-amber-600 border-amber-100" },
  { icon: Music, label: "Nightlife", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
];

const ATTRACTION_TYPES = ["All", "Landmark", "Museum", "Park", "Adventure", "Culture", "Nature", "Tour", "Beach", "Temple", "Shopping"];

const VEHICLE_TYPES = [
  { label: "All", value: "all" },
  { label: "Car", value: "car" },
  { label: "Bike", value: "bike" },
];

const POPULAR_DESTINATIONS = ["Maldives", "Paris", "Tokyo", "Bali", "Dubai", "Santorini", "New York", "Singapore"];

const TRENDING_DESTINATIONS = [
  { name: "Maldives", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=400", count: "142 stays" },
  { name: "Bali", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400", count: "98 stays" },
  { name: "Paris", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=400", count: "215 stays" },
  { name: "Dubai", img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400", count: "167 stays" },
];

// ─── Component ────────────────────────────────────────────────────────────────

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Carry search dates through to stay details
  const urlCheckIn = searchParams.get("checkIn") || undefined;
  const urlCheckOut = searchParams.get("checkOut") || undefined;
  const urlGuestsTotal = parseInt(searchParams.get("guests") || "2");
  const urlAdults = searchParams.has("adults") ? parseInt(searchParams.get("adults") as string) : undefined;
  const urlChildren = searchParams.has("children") ? parseInt(searchParams.get("children") as string) : undefined;

  // Active tab
  const [activeTab, setActiveTab] = useState<SearchTab>(() => getTabFromCategory(searchParams.get("category")));

  // Shared
  const [searchQuery, setSearchQuery] = useState(searchParams.get("destination") || "");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Hotels state
  const [hotelResults, setHotelResults] = useState<any[]>([]);
  const [hotelLoading, setHotelLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 200000]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState("recommended");
  const [hotelType, setHotelType] = useState("all");

  // Attractions state
  const [attractionResults, setAttractionResults] = useState<any[]>([]);
  const [attractionLoading, setAttractionLoading] = useState(false);
  const [attractionType, setAttractionType] = useState("All");
  const [attractionPriceRange, setAttractionPriceRange] = useState([0, 50000]);

  // Vehicles state
  const [vehicleResults, setVehicleResults] = useState<any[]>([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleType, setVehicleType] = useState("all");
  const [pricePerKmRange, setPricePerKmRange] = useState([0, 500]);
  const [minSeats, setMinSeats] = useState(1);

  const [allStays, setAllStays] = useState<any[]>([]);
  const [loadingAllStays, setLoadingAllStays] = useState(true);

  useEffect(() => {
    setActiveTab(getTabFromCategory(searchParams.get("category")));
  }, [searchParams]);

  useEffect(() => {
    const fetchAllStays = async () => {
      try {
        setLoadingAllStays(true);
        const res = await api.get("/stays/search?limit=100");
        setAllStays(res.data?.data?.stays || []);
      } catch (err) {
        console.error("Failed to fetch all stays in SearchResults", err);
      } finally {
        setLoadingAllStays(false);
      }
    };
    fetchAllStays();
  }, []);

  // ── Fetch hotels ────────────────────────────────────────────────────────────
  const fetchHotels = async () => {
    try {
      setHotelLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("city", searchQuery);
      params.append("minPrice", String(priceRange[0]));
      params.append("maxPrice", String(priceRange[1]));
      if (selectedRatings.length > 0) params.append("rating", selectedRatings.join(","));
      params.append("sortBy", sortBy);
      params.append("page", "1");
      params.append("limit", "20");
      const res = await api.get(`/stays/search?${params.toString()}`);
      setHotelResults(res?.data?.success ? (res.data.data?.stays || []) : []);
    } catch {
      setHotelResults([]);
    } finally {
      setHotelLoading(false);
    }
  };

  // ── Fetch attractions ───────────────────────────────────────────────────────
  const fetchAttractions = async () => {
    try {
      setAttractionLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (attractionType !== "All") params.append("type", attractionType);
      params.append("minPrice", String(attractionPriceRange[0]));
      params.append("maxPrice", String(attractionPriceRange[1]));
      params.append("page", "1");
      params.append("limit", "20");
      const res = await api.get(`/attractions/search?${params.toString()}`);
      setAttractionResults(res?.data?.success ? (res.data.data?.attractions || []) : []);
    } catch {
      setAttractionResults([]);
    } finally {
      setAttractionLoading(false);
    }
  };

  // ── Fetch vehicles ──────────────────────────────────────────────────────────
  const fetchVehicles = async () => {
    try {
      setVehicleLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (vehicleType !== "all") params.append("type", vehicleType);
      params.append("minPricePerKm", String(pricePerKmRange[0]));
      params.append("maxPricePerKm", String(pricePerKmRange[1]));
      if (minSeats > 1) params.append("minSeats", String(minSeats));
      params.append("page", "1");
      params.append("limit", "20");
      const res = await api.get(`/vehicles/search?${params.toString()}`);
      setVehicleResults(res?.data?.success ? (res.data.data?.vehicles || []) : []);
    } catch {
      setVehicleResults([]);
    } finally {
      setVehicleLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchHotels, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, priceRange, selectedRatings, sortBy]);

  useEffect(() => {
    if (activeTab !== "attractions") return;
    const t = setTimeout(fetchAttractions, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, attractionType, attractionPriceRange, activeTab]);

  useEffect(() => {
    if (activeTab !== "vehicles") return;
    const t = setTimeout(fetchVehicles, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, vehicleType, pricePerKmRange, minSeats, activeTab]);

  // ── Display data (API only — no sample fallback) ─────────────────────────────
  const displayHotels = useMemo(() => {
    let filtered = hotelType !== "all" 
      ? hotelResults.filter(p => p.type?.toUpperCase() === hotelType.toUpperCase()) 
      : hotelResults;

    const vibe = searchParams.get("vibe")?.toLowerCase();
    if (vibe) {
      filtered = filtered.filter(p => matchVibe(p, vibe));
    }
    return filtered;
  }, [hotelResults, hotelType, searchParams]);

  const displayAttractions = useMemo(() => {
    let filtered = attractionResults;
    const vibe = searchParams.get("vibe")?.toLowerCase();
    if (vibe) {
      filtered = filtered.filter(a => matchVibe(a, vibe));
    }
    return filtered;
  }, [attractionResults, searchParams]);

  const displayVehicles = useMemo(() => {
    return vehicleResults;
  }, [vehicleResults]);

  const clearAll = () => {
    setSearchQuery("");
    setPriceRange([0, 200000]);
    setSelectedRatings([]);
    setHotelType("all");
    setAttractionType("All");
    setVehicleType("all");
    setPricePerKmRange([0, 500]);
    setMinSeats(1);
    setAttractionPriceRange([0, 50000]);
    setSearchParams(new URLSearchParams());
  };

  const activeFiltersCount =
    selectedRatings.length +
    (priceRange[0] > 0 || priceRange[1] < 200000 ? 1 : 0) +
    (vehicleType !== "all" ? 1 : 0) +
    (attractionType !== "All" ? 1 : 0);

  const isLoading = activeTab === "hotels" ? hotelLoading : activeTab === "attractions" ? attractionLoading : vehicleLoading;
  const resultCount = activeTab === "hotels" ? displayHotels.length : activeTab === "attractions" ? displayAttractions.length : displayVehicles.length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Sticky search + tabs bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-16 z-30">
        <div className="container mx-auto px-4 py-2.5">

          {/* Top row: search input + sort + view toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === "hotels" ? "Search destinations..." : activeTab === "attractions" ? "Search attractions..." : "Search vehicles..."}
                className="pl-9 h-9 rounded-xl bg-gray-50 border-gray-200 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {activeTab === "hotels" && (
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 h-9 rounded-xl border-gray-200 bg-gray-50 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="recommended" className="text-xs">Recommended</SelectItem>
                  <SelectItem value="price-low" className="text-xs">Price: Low → High</SelectItem>
                  <SelectItem value="price-high" className="text-xs">Price: High → Low</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-gray-400"}`}>
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-gray-400"}`}>
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowMobileFilters(!showMobileFilters)} className="lg:hidden h-9 rounded-xl relative px-3">
              <FilterIcon className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">{activeFiltersCount}</span>
              )}
            </Button>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1 mt-2.5">
            {([
              { id: "hotels", label: "Hotels", icon: Building2 },
              { id: "attractions", label: "Attractions", icon: Ticket },
              { id: "vehicles", label: "Vehicles", icon: Car },
            ] as { id: SearchTab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === id
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}

            <div className="ml-3 h-4 w-px bg-gray-200" />

            {/* Quick destination chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar ml-1">
              <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
              {POPULAR_DESTINATIONS.map(dest => (
                <button
                  key={dest}
                  onClick={() => setSearchQuery(dest === searchQuery ? "" : dest)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    searchQuery === dest ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {dest}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-5">
        <div className="flex gap-5">

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <aside className={`w-60 flex-shrink-0 ${showMobileFilters ? "block" : "hidden"} lg:block`}>
            <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2 space-y-3">

              {/* Filter header */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FilterIcon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-bold text-gray-900">Filters</span>
                  </div>
                  <button onClick={clearAll} className="text-xs text-primary font-medium flex items-center gap-1">
                    <CloseIcon className="h-3 w-3" /> Clear
                  </button>
                </div>

                {/* ── Hotels filters ── */}
                {activeTab === "hotels" && (
                  <>
                    <div className="mb-4">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Price / Night</p>
                      <div className="bg-gray-50 rounded-xl p-3 mb-2">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-bold text-gray-900">₹{priceRange[0].toLocaleString()}</span>
                          <span className="text-sm font-bold text-gray-900">₹{priceRange[1].toLocaleString()}</span>
                        </div>
                        <Slider value={priceRange} min={0} max={200000} step={2000} onValueChange={setPriceRange} />
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Star Rating</p>
                      <div className="space-y-1.5">
                        {STAR_LEVELS.map(star => (
                          <label key={star} className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${selectedRatings.includes(star) ? "bg-primary/5 border-primary/20" : "border-transparent hover:bg-gray-50"}`}>
                            <Checkbox
                              checked={selectedRatings.includes(star)}
                              onCheckedChange={() => setSelectedRatings(prev => prev.includes(star) ? prev.filter(x => x !== star) : [...prev, star])}
                            />
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <StarIcon key={i} className={`h-3 w-3 ${i < star ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">& up</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Attractions filters ── */}
                {activeTab === "attractions" && (
                  <>
                    <div className="mb-4">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Price / Person</p>
                      <div className="bg-gray-50 rounded-xl p-3 mb-2">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-bold text-gray-900">₹{attractionPriceRange[0].toLocaleString()}</span>
                          <span className="text-sm font-bold text-gray-900">₹{attractionPriceRange[1].toLocaleString()}</span>
                        </div>
                        <Slider value={attractionPriceRange} min={0} max={50000} step={500} onValueChange={setAttractionPriceRange} />
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ATTRACTION_TYPES.map(t => (
                          <button
                            key={t}
                            onClick={() => setAttractionType(t)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                              attractionType === t ? "bg-primary/10 text-primary border-primary/20" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Vehicles filters ── */}
                {activeTab === "vehicles" && (
                  <>
                    <div className="mb-4">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Price / km</p>
                      <div className="bg-gray-50 rounded-xl p-3 mb-2">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-bold text-gray-900">₹{pricePerKmRange[0]}</span>
                          <span className="text-sm font-bold text-gray-900">₹{pricePerKmRange[1]}</span>
                        </div>
                        <Slider value={pricePerKmRange} min={0} max={500} step={5} onValueChange={setPricePerKmRange} />
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Vehicle Type</p>
                      <div className="flex flex-wrap gap-1.5">
                        {VEHICLE_TYPES.map(({ label, value }) => (
                          <button
                            key={value}
                            onClick={() => setVehicleType(value)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                              vehicleType === value ? "bg-primary/10 text-primary border-primary/20" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Min. Seats</p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setMinSeats(s => Math.max(1, s - 1))} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm font-bold">−</button>
                        <div className="flex items-center gap-1 text-sm font-bold text-gray-900">
                          <Users className="h-3.5 w-3.5 text-primary" /> {minSeats}+
                        </div>
                        <button onClick={() => setMinSeats(s => Math.min(12, s + 1))} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm font-bold">+</button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Property type panel — hotels only */}
              {activeTab === "hotels" && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Property Type</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {HOTEL_TYPES.map(({ label, value, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setHotelType(value)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${
                          hotelType === value ? "bg-primary/5 border-primary/25 text-primary" : "border-gray-100 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trust badge */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <VerifiedIcon className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-700">Verified Listings</span>
                </div>
                <p className="text-[11px] text-emerald-600 leading-relaxed">All listings are personally verified for quality & authenticity.</p>
              </div>
            </div>
          </aside>

          {/* ── Main content ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Travel Categories (Vibes) bar */}
            {(activeTab === "hotels" || activeTab === "attractions") && (
              <div className="mb-5 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-bold text-gray-900">Browse by Travel Vibe</span>
                  </div>
                  {searchParams.get("vibe") && (
                    <button
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete("vibe");
                        setSearchParams(newParams);
                      }}
                      className="text-[10px] text-primary font-bold uppercase tracking-wider hover:underline"
                    >
                      Clear Vibe
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                  {CATEGORIES.map((c) => {
                    const isActive = searchParams.get("vibe")?.toLowerCase() === c.label.toLowerCase();
                    const count = allStays.filter((s) => matchVibe(s, c.label)).length;
                    return (
                      <button
                        key={c.label}
                        onClick={() => {
                          const newParams = new URLSearchParams(searchParams);
                          if (isActive) {
                            newParams.delete("vibe");
                          } else {
                            newParams.set("vibe", c.label.toLowerCase());
                          }
                          setSearchParams(newParams);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-shrink-0 transition-all duration-200 group ${
                          isActive
                            ? `${c.color.replace("border-sky-100", "border-sky-300").replace("border-emerald-100", "border-emerald-300").replace("border-violet-100", "border-violet-300").replace("border-lime-100", "border-lime-300").replace("border-orange-100", "border-orange-300").replace("border-rose-100", "border-rose-300").replace("border-amber-100", "border-amber-300").replace("border-indigo-100", "border-indigo-300")} shadow-sm scale-[1.01]`
                            : "bg-white hover:bg-gray-50 border-gray-100 text-gray-600"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 ${
                          isActive ? "bg-white" : "bg-gray-50"
                        }`}>
                          <c.icon className={`h-4 w-4 ${isActive ? "" : "text-gray-500"}`} />
                        </div>
                        <div className="flex flex-col items-start text-left">
                          <span className="text-[8px] font-black uppercase tracking-wider">{c.label}</span>
                          <span className="text-[7px] font-semibold opacity-60">
                            {loadingAllStays ? "..." : `${count} stay${count === 1 ? "" : "s"}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Page header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 capitalize">
                    {searchParams.get("vibe") ? (
                      `${searchParams.get("vibe")!.charAt(0).toUpperCase() + searchParams.get("vibe")!.slice(1).toLowerCase()} Stays & Experiences`
                    ) : searchQuery ? (
                      `${activeTab === "hotels" ? "Hotels" : activeTab === "attractions" ? "Attractions" : "Vehicles"} near "${searchQuery}"`
                    ) : (
                      activeTab === "hotels" ? "All Hotels & Stays"
                      : activeTab === "attractions" ? "All Attractions"
                      : "All Vehicles"
                    )}
                  </h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isLoading ? "Searching..." : `${resultCount} results found`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-gray-400 hidden sm:block">Best prices guaranteed</span>
                </div>
              </div>

              {/* Sub-type tabs (context-sensitive) */}
              {activeTab === "hotels" && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {HOTEL_TYPES.map(({ label, value, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setHotelType(value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                        hotelType === value ? "bg-primary text-white shadow-sm shadow-primary/25" : "bg-white border border-gray-200 text-gray-600 hover:border-primary/30"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === "attractions" && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {ATTRACTION_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setAttractionType(t)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                        attractionType === t ? "bg-primary text-white shadow-sm shadow-primary/25" : "bg-white border border-gray-200 text-gray-600 hover:border-primary/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === "vehicles" && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {VEHICLE_TYPES.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setVehicleType(value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                        vehicleType === value ? "bg-primary text-white shadow-sm shadow-primary/25" : "bg-white border border-gray-200 text-gray-600 hover:border-primary/30"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results grid */}
            {isLoading ? (
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
            ) : (
              <>
                {/* Hotels grid */}
                {activeTab === "hotels" && (
                  <div className={`grid gap-3 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                    {displayHotels.map(p => (
                      <PropertyCard
                        key={p.id}
                        id={p.id}
                        image={Array.isArray(p.images) && p.images.length > 0 && p.images[0] ? p.images[0] : "https://images.unsplash.com/photo-1544124499-58912cbddaad?auto=format&fit=crop&q=80&w=800"}
                        title={p.title || p.name || "Hotel"}
                        location={`${p.city}, ${p.country}`}
                        rating={Number(p.avgRating) || p.rating || 0}
                        reviews={p.totalReviews || p.reviewsCount || 0}
                        price={p.rooms?.[0]?.pricePerNight || 0}
                        totalPrice={(p.rooms?.[0]?.pricePerNight || 0) * 1.15}
                        nights={1}
                        amenities={p.amenities || []}
                        type={p.type}
                        description={p.description}
                        isFavorite={isFavorite(p.id)}
                        viewMode={viewMode}
                        checkIn={urlCheckIn}
                        checkOut={urlCheckOut}
                        guests={urlGuestsTotal}
                        adults={urlAdults}
                        children={urlChildren}
                        onToggleFavorite={() => toggleFavorite({ 
                          ...p, 
                          title: p.title || p.name, 
                          image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined,
                          price: p.rooms?.[0]?.pricePerNight,
                          reviews: p.totalReviews || p.reviewsCount,
                          location: `${p.city}, ${p.country}`
                        })}
                      />
                    ))}
                    {displayHotels.length === 0 && <EmptyState onClear={clearAll} />}
                  </div>
                )}

                {/* Attractions grid */}
                {activeTab === "attractions" && (
                  <div className={`grid gap-3 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                    {displayAttractions.map(a => (
                      <AttractionCard
                        key={a.id}
                        id={a.id}
                        image={a.image || a.images?.[0] || ""}
                        title={a.title}
                        location={a.location?.city ? `${a.location.city}, ${a.location.country || ""}` : (a.location || "")}
                        type={a.type}
                        rating={a.rating}
                        reviews={a.reviews || a.reviewsCount}
                        price={a.price}
                        duration={a.duration}
                        isFavorite={isFavorite(a.id)}
                        viewMode={viewMode}
                        onToggleFavorite={() => toggleFavorite({
                          ...a,
                          title: a.title,
                          image: a.image || a.images?.[0] || "",
                          price: a.price,
                          reviews: a.reviews || a.reviewsCount,
                          location: a.location?.city ? `${a.location.city}, ${a.location.country || ""}` : (a.location || ""),
                          rating: a.rating,
                          type: "attraction",
                          amenities: [],
                          cancellable: true
                        })}
                      />
                    ))}
                    {displayAttractions.length === 0 && <EmptyState onClear={clearAll} />}
                  </div>
                )}

                {/* Vehicles grid */}
                {activeTab === "vehicles" && (
                  <div className={`grid gap-3 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                    {displayVehicles.map(v => (
                      <VehicleCard
                        key={v.id}
                        id={v.id}
                        image={v.image || v.images?.[0] || ""}
                        brand={v.brand}
                        model={v.model}
                        type={v.type}
                        seats={v.seats}
                        pricePerKm={v.pricePerKm}
                        rating={v.rating}
                        reviews={v.reviews || v.reviewsCount}
                        location={v.location || v.city}
                        isFavorite={isFavorite(v.id)}
                        viewMode={viewMode}
                        onToggleFavorite={() => toggleFavorite({
                          ...v,
                          id: v.id,
                          image: v.image || v.images?.[0] || "",
                          title: `${v.brand} ${v.model}`,
                          price: v.pricePerKm,
                          reviews: v.reviews || v.reviewsCount,
                          location: v.location || v.city || "",
                          rating: v.rating || 4.5,
                          type: "vehicle",
                          amenities: [],
                          cancellable: true
                        })}
                      />
                    ))}
                    {displayVehicles.length === 0 && <EmptyState onClear={clearAll} />}
                  </div>
                )}
              </>
            )}

            {/* Trending destinations */}
            {!isLoading && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-bold text-gray-900">Trending Destinations</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {TRENDING_DESTINATIONS.map(dest => (
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

            {/* Why book with us */}
            {!isLoading && (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Wifi, label: "Free WiFi", desc: "Stay connected" },
                  { icon: VerifiedIcon, label: "Verified", desc: "100% authentic" },
                  { icon: Car, label: "Easy Transfers", desc: "Airport pickups" },
                  { icon: Sparkles, label: "Best Price", desc: "Price match" },
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

const EmptyState = ({ onClear }: { onClear: () => void }) => (
  <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-gray-100">
    <SearchIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
    <p className="text-gray-600 font-semibold">No results found</p>
    <p className="text-sm text-gray-400 mt-1">Try a different search or adjust your filters</p>
    <Button variant="outline" onClick={onClear} className="mt-4 rounded-xl text-xs h-9">Clear Filters</Button>
  </div>
);

export default SearchResults;
