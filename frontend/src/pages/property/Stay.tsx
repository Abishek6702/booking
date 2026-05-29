/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SlidersHorizontal as FilterIcon, X as CloseIcon,
  Star as StarIcon, Grid3X3, List, Building2, Home, Waves, Leaf,
  TrendingUp, Sparkles, Wifi, Car, CheckCircle2 as VerifiedIcon,
  Mountain, TreePine, Compass, Camera, Utensils, Music,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { useFavorites } from "@/context/FavoritesContext";
import { matchVibe } from "@/utils/vibeMatcher";

// ─── Constants ────────────────────────────────────────────────────────────────

const STAR_LEVELS = [5, 4, 3, 2, 1];

const PROPERTY_TYPES = [
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

const POPULAR_DESTINATIONS = ["Maldives", "Paris", "Tokyo", "Bali", "Dubai", "Santorini", "New York", "Singapore"];

const AMENITIES_LIST = ["Pool", "Spa", "Gym", "Sea View", "Free WiFi", "Parking", "Breakfast", "Pet Friendly"];

const TRENDING = [
  { name: "Maldives", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=400", count: "142 stays" },
  { name: "Bali", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400", count: "98 stays" },
  { name: "Paris", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=400", count: "215 stays" },
  { name: "Dubai", img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400", count: "167 stays" },
];




// ─── Component ────────────────────────────────────────────────────────────────

const Stay = () => {
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { isFavorite, toggleFavorite } = useFavorites();

  const [searchParams, setSearchParams] = useSearchParams();
  const vibe = searchParams.get("vibe") || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState([0, 200000]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState("recommended");
  const [propertyType, setPropertyType] = useState("all");

  const [allStays, setAllStays] = useState<any[]>([]);
  const [loadingAllStays, setLoadingAllStays] = useState(true);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) params.append("city", searchQuery);
        params.append("minPrice", String(priceRange[0]));
        params.append("maxPrice", String(priceRange[1]));
        if (selectedRatings.length > 0) params.append("rating", selectedRatings.join(","));
        params.append("sortBy", sortBy);
        params.append("page", "1");
        params.append("limit", "50");
        const res = await api.get(`/stays/search?${params.toString()}`);
        if (res?.data?.success) {
          const raw = Array.isArray(res.data.data?.stays) ? res.data.data.stays : [];
          setHotels(raw);
        } else {
          setHotels([]);
        }
      } catch {
        setHotels([]);
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(fetchHotels, 400);
    return () => clearTimeout(t);
  }, [searchQuery, priceRange, selectedRatings, sortBy]);

  useEffect(() => {
    const fetchAllStays = async () => {
      try {
        setLoadingAllStays(true);
        const res = await api.get("/stays/search?limit=100");
        setAllStays(res.data?.data?.stays || []);
      } catch (err) {
        console.error("Failed to fetch all stays in Stay page", err);
      } finally {
        setLoadingAllStays(false);
      }
    };
    fetchAllStays();
  }, []);

  // ── Filtered display list ─────────────────────────────────────────────────
  const displayHotels = useMemo(() => {
    let list = propertyType === "all" ? hotels : hotels.filter(h => h.type?.toUpperCase() === propertyType);
    if (vibe) {
      list = list.filter(h => matchVibe(h, vibe));
    }
    return list;
  }, [hotels, propertyType, vibe]);

  const clearAll = () => {
    setSearchQuery("");
    setPriceRange([0, 200000]);
    setSelectedRatings([]);
    setPropertyType("all");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("vibe");
    setSearchParams(newParams);
  };

  const activeFiltersCount =
    (priceRange[0] > 0 || priceRange[1] < 200000 ? 1 : 0) +
    selectedRatings.length +
    (propertyType !== "all" ? 1 : 0) +
    (vibe ? 1 : 0);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-5">
        <div className="flex gap-5">

          {/* ── Sidebar ────────────────────────────────────────────────── */}
          <aside className={`w-60 flex-shrink-0 ${showMobileFilters ? "block" : "hidden"} lg:block`}>
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 space-y-3">

              {/* Filters panel */}
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

                {/* Price range */}
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

                {/* Star rating */}
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
              </div>

              {/* Property type */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Property Type</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PROPERTY_TYPES.map(({ label, value, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setPropertyType(value)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${propertyType === value ? "bg-primary/5 border-primary/25 text-primary" : "border-gray-100 text-gray-500 hover:bg-gray-50"}`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {AMENITIES_LIST.map(amenity => (
                    <button key={amenity} className="px-2.5 py-1 bg-gray-50 hover:bg-primary/5 hover:text-primary hover:border-primary/20 border border-gray-100 text-gray-500 rounded-full text-[11px] font-medium transition-all">
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trust badge */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <VerifiedIcon className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-700">Verified Properties</span>
                </div>
                <p className="text-[11px] text-emerald-600 leading-relaxed">All listings are verified for quality & authenticity.</p>
              </div>
            </div>
          </aside>

          {/* ── Main Content ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Travel Categories (Vibes) bar */}
            <div className="mb-5 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold text-gray-900">Browse by Travel Vibe</span>
                </div>
                {vibe && (
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
                  const isActive = vibe.toLowerCase() === c.label.toLowerCase();
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

            {/* Page header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {searchQuery 
                      ? `Hotels in "${searchQuery}"` 
                      : vibe 
                      ? `${vibe.charAt(0).toUpperCase() + vibe.slice(1).toLowerCase()} Stays & Hotels` 
                      : "Available Hotels & Stays"}
                  </h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {loading
                      ? "Searching..."
                      : displayHotels.length === 0
                      ? "No available hotels match your filters"
                      : `${displayHotels.length} available propert${displayHotels.length === 1 ? "y" : "ies"}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-gray-400 hidden sm:block">Best prices guaranteed</span>
                </div>
              </div>

              {/* Property type tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {PROPERTY_TYPES.map(({ label, value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setPropertyType(value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${propertyType === value ? "bg-primary text-white shadow-sm shadow-primary/25" : "bg-white border border-gray-200 text-gray-600 hover:border-primary/30"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
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
            ) : displayHotels.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Building2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-600 font-semibold">No available hotels found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different destination or adjust your filters</p>
                <Button variant="outline" onClick={clearAll} className="mt-4 rounded-xl text-xs h-9">Clear Filters</Button>
              </div>
            ) : (
              <div className={`grid gap-3 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                {displayHotels.map(h => (
                  <PropertyCard
                    key={h.id}
                    id={h.id}
                    image={h.images?.[0] || "https://images.unsplash.com/photo-1544124499-58912cbddaad?auto=format&fit=crop&q=80&w=800"}
                    title={h.title || h.name}
                    location={`${h.city}, ${h.country}`}
                    rating={h.avgRating || h.rating || 0}
                    reviews={h.totalReviews || h.reviewsCount || 0}
                    price={h.rooms?.[0]?.pricePerNight || h.basePricePerNight || 0}
                    totalPrice={(h.rooms?.[0]?.pricePerNight || h.basePricePerNight || 0) * 1.15}
                    nights={1}
                    amenities={h.amenities || []}
                    type={h.type}
                    description={h.description}
                    viewMode={viewMode}
                    isFavorite={isFavorite(h.id)}
                    onToggleFavorite={() => toggleFavorite({
                      id: h.id,
                      title: h.title || h.name,
                      image: h.images?.[0] || "",
                      location: `${h.city}, ${h.country}`,
                      rating: h.avgRating || h.rating || 0,
                      reviews: h.totalReviews || h.reviewsCount || 0,
                      price: h.rooms?.[0]?.pricePerNight || h.basePricePerNight || 0,
                      amenities: h.amenities || [],
                      type: h.type || "HOTEL",
                      cancellable: true,
                    })}
                  />
                ))}
              </div>
            )}

            {/* Trending destinations */}
            {!loading && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-bold text-gray-900">Trending Destinations</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {TRENDING.map(dest => (
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

            {/* Perks strip */}
            {!loading && (
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

export default Stay;
