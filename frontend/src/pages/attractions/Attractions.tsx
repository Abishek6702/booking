/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  MapPin, Star as StarIcon, Clock, Search, Loader2, Sparkles,
  Heart, CheckCircle, X as CloseIcon, SlidersHorizontal as FilterIcon,
  Grid3X3, List, TrendingUp, CheckCircle2 as VerifiedIcon,
  Ticket, Mountain, Landmark, Waves, Trees, Compass, Camera,
  Info,
} from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import api from "@/lib/api";
import attraction1 from "@/assets/attraction1.jpg";
import attraction2 from "@/assets/attraction2.jpg";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "All", value: "All", icon: Grid3X3 },
  { label: "Nature", value: "Nature & Wildlife", icon: Trees },
  { label: "Culture", value: "Culture & History", icon: Landmark },
  { label: "Adventure", value: "Adventure", icon: Mountain },
  { label: "Water Sports", value: "Water Sports", icon: Waves },
  { label: "Temple Tours", value: "Temple Tours", icon: Compass },
  { label: "Sightseeing", value: "Sightseeing", icon: Camera },
];

const POPULAR_DESTINATIONS = ["Bali", "Paris", "Tokyo", "Dubai", "Santorini", "Goa", "Maldives"];


const CATEGORY_COLORS: Record<string, string> = {
  "Nature & Wildlife": "bg-emerald-50 text-emerald-600 border-emerald-100",
  "Culture & History": "bg-purple-50 text-purple-600 border-purple-100",
  Adventure: "bg-orange-50 text-orange-600 border-orange-100",
  "Water Sports": "bg-cyan-50 text-cyan-600 border-cyan-100",
  "Temple Tours": "bg-amber-50 text-amber-600 border-amber-100",
  Sightseeing: "bg-blue-50 text-blue-600 border-blue-100",
};

// ─── Attraction Card ───────────────────────────────────────────────────────────

const ACard = ({
  attraction, isFav, onFav, onOpen, viewMode,
}: {
  attraction: any;
  isFav: boolean;
  onFav: () => void;
  onOpen: () => void;
  viewMode: "grid" | "list";
}) => {
  const catColor = CATEGORY_COLORS[attraction.category] || "bg-gray-100 text-gray-600 border-gray-200";

  if (viewMode === "grid") {
    return (
      <div onClick={onOpen} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
        <div className="relative h-44 overflow-hidden">
          <img src={attraction.images?.[0] || attraction.image} alt={attraction.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
          <button
            onClick={(e) => { e.stopPropagation(); onFav(); }}
            className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl hover:bg-white transition-all shadow-sm"
          >
            <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
          </button>
          <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${catColor}`}>
            {attraction.category}
          </div>
          {attraction.duration && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[10px] font-medium">
              <Clock className="h-2.5 w-2.5" /> {attraction.duration}
            </div>
          )}
        </div>

        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold text-gray-900 line-clamp-1 flex-1 group-hover:text-primary transition-colors">{attraction.title}</h3>
            <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-lg flex-shrink-0">
              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-gray-900">{attraction.rating}</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-2">
            <MapPin className="h-3 w-3 text-primary flex-shrink-0" /> {typeof attraction.location === 'object' ? `${attraction.location.city}, ${attraction.location.country}` : attraction.location}
          </p>

          {attraction.description && (
            <p className="text-[11px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">{attraction.description}</p>
          )}

          <div className="flex items-center justify-between pt-2.5 border-t border-gray-50">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-gray-900">₹{(attraction.price || 0).toLocaleString()}</span>
                <span className="text-[10px] text-gray-400">/person</span>
              </div>
              <p className="text-[10px] text-gray-400">{attraction.reviews?.toLocaleString()} reviews</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div onClick={onOpen} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group flex cursor-pointer">
      <div className="relative w-48 flex-shrink-0 overflow-hidden">
        <img src={attraction.images?.[0] || attraction.image} alt={attraction.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <button
          onClick={(e) => { e.stopPropagation(); onFav(); }}
          className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl hover:bg-white transition-all shadow-sm"
        >
          <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
        </button>
        <div className={`absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${catColor}`}>
          {attraction.category}
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-sm font-bold text-gray-900 line-clamp-1 flex-1 group-hover:text-primary transition-colors">{attraction.title}</h3>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg flex-shrink-0">
              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-gray-900">{attraction.rating}</span>
              <span className="text-[10px] text-gray-400">({attraction.reviews?.toLocaleString()})</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-2">
            <MapPin className="h-3 w-3 text-primary flex-shrink-0" /> {typeof attraction.location === 'object' ? `${attraction.location.city}, ${attraction.location.country}` : attraction.location}
          </p>

          {attraction.description && (
            <p className="text-[11px] text-gray-500 line-clamp-1 mb-2">{attraction.description}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {attraction.duration && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-500 rounded-full text-[11px] font-medium border border-gray-100">
                <Clock className="h-3 w-3" /> {attraction.duration}
              </span>
            )}
            {/* Removed: What's Included chips */}
          </div>
        </div>

        <div className="flex items-end justify-between pt-2.5 border-t border-gray-50 mt-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-gray-900">₹{(attraction.price || 0).toLocaleString()}</span>
              <span className="text-[11px] text-gray-400">/person</span>
            </div>
            <p className="text-[11px] text-primary font-medium">Free cancellation</p>
          </div>
          {/* Removed: Book Now button */}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

const Attractions = () => {
  const [attractions, setAttractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedAttraction, setSelectedAttraction] = useState<any>(null);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.get("/attractions/search?limit=20");
        const data = res.data?.data?.attractions || res.data?.data || [];
        setAttractions(data);
      } catch {
        setAttractions([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const displayAttractions = useMemo(() => {
    let list = [...attractions];
    if (searchTerm) list = list.filter(a => `${a.title} ${a.location}`.toLowerCase().includes(searchTerm.toLowerCase()));
    if (activeCategory !== "All") list = list.filter(a => a.category === activeCategory);
    list = list.filter(a => (a.price || 0) >= priceRange[0] && (a.price || 0) <= priceRange[1]);
    return list;
  }, [attractions, searchTerm, activeCategory, priceRange]);

  const clearAll = () => {
    setSearchTerm("");
    setActiveCategory("All");
    setPriceRange([0, 10000]);
  };

  const activeFiltersCount =
    (activeCategory !== "All" ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-5">
        <div className="flex gap-5">

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <aside className={`w-60 flex-shrink-0 ${showMobileFilters ? "block" : "hidden"} lg:block`}>
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 space-y-3">

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
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Price / Person</p>
                  <div className="bg-gray-50 rounded-xl p-3 mb-2">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-gray-900">₹{priceRange[0].toLocaleString()}</span>
                      <span className="text-sm font-bold text-gray-900">₹{priceRange[1].toLocaleString()}</span>
                    </div>
                    <Slider value={priceRange} min={0} max={10000} step={200} onValueChange={setPriceRange} />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</p>
                  <div className="space-y-1">
                    {CATEGORIES.map(({ label, value, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setActiveCategory(value)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${activeCategory === value ? "bg-primary/5 border border-primary/20 text-primary" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trust badge */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <VerifiedIcon className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-700">Curated Experiences</span>
                </div>
                <p className="text-[11px] text-emerald-600 leading-relaxed">Hand-picked and reviewed by our travel experts.</p>
              </div>

              {/* Quick facts */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Why Book With Us</p>
                {[
                  { icon: CheckCircle, text: "Free cancellation on most" },
                  { icon: Ticket, text: "Instant confirmation" },
                  { icon: Sparkles, text: "Best price guarantee" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-[11px] text-gray-600">
                    <Icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    {text}
                  </div>
                ))}
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
                    {searchTerm ? `Attractions near "${searchTerm}"` : activeCategory !== "All" ? activeCategory : "All Attractions"}
                  </h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {loading ? "Loading..." : `${displayAttractions.length} experiences found`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-gray-400 hidden sm:block">Free cancellation available</span>
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {CATEGORIES.map(({ label, value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setActiveCategory(value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${activeCategory === value ? "bg-primary text-white shadow-sm shadow-primary/25" : "bg-white border border-gray-200 text-gray-600 hover:border-primary/30"}`}
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
            ) : displayAttractions.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Ticket className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-600 font-semibold">No attractions found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different category or search term</p>
                <Button variant="outline" onClick={clearAll} className="mt-4 rounded-xl text-xs h-9">Clear Filters</Button>
              </div>
            ) : (
              <div className={`grid gap-3 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                {displayAttractions.map(a => (
                  <ACard
                    key={a.id}
                    attraction={a}
                    isFav={isFavorite(a.id)}
                    onFav={() => toggleFavorite({
                      id: a.id,
                      image: a.images?.[0] || a.image,
                      title: a.title,
                      location: typeof a.location === 'object' ? `${a.location.city}, ${a.location.country}` : String(a.location || ""),
                      rating: a.rating || 4.8,
                      reviews: a.reviews || 0,
                      price: a.price || 0,
                      type: "attraction",
                      amenities: [],
                      cancellable: true,
                    })}
                    onOpen={() => setSelectedAttraction(a)}
                    viewMode={viewMode}
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
                  {[
                    { name: "Bali", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400", count: "34 experiences" },
                    { name: "Paris", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=400", count: "28 experiences" },
                    { name: "Dubai", img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400", count: "22 experiences" },
                    { name: "Tokyo", img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=400", count: "19 experiences" },
                  ].map(dest => (
                    <button
                      key={dest.name}
                      onClick={() => setSearchTerm(dest.name)}
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
                  { icon: CheckCircle, label: "Free Cancellation", desc: "On most bookings" },
                  { icon: VerifiedIcon, label: "Verified Guides", desc: "Licensed & certified" },
                  { icon: Ticket, label: "Instant Tickets", desc: "Straight to your inbox" },
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

      {/* ── Detail Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!selectedAttraction} onOpenChange={() => setSelectedAttraction(null)}>
        <DialogContent className="p-0 overflow-hidden max-w-lg rounded-2xl border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          {selectedAttraction && (
            <>
              {/* Image */}
              <div className="relative h-52 overflow-hidden">
                <img src={selectedAttraction.images?.[0] || selectedAttraction.image} alt={selectedAttraction.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <button
                  onClick={() => setSelectedAttraction(null)}
                  className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm p-1.5 rounded-xl text-white hover:bg-black/60 transition-all"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
                <div className="absolute bottom-0 left-0 p-4">
                  <div className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold border mb-2 ${CATEGORY_COLORS[selectedAttraction.category] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {selectedAttraction.category}
                  </div>
                  <h2 className="text-lg font-bold text-white leading-tight">{selectedAttraction.title}</h2>
                </div>
              </div>



              {/* Body */}
              <div className="p-5 bg-white">
                {/* Meta row */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                    <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-gray-900">{selectedAttraction.rating}</span>
                    <span className="text-[11px] text-gray-400">({selectedAttraction.reviews?.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {typeof selectedAttraction.location === 'object' ? `${selectedAttraction.location.city}, ${selectedAttraction.location.country}` : selectedAttraction.location}
                  </div>
                  {selectedAttraction.duration && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Clock className="h-3.5 w-3.5 text-primary" /> {selectedAttraction.duration}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Info className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-bold text-gray-900">About this experience</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{selectedAttraction.description}</p>
                </div>

                {/* Price + CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-[11px] text-gray-400 font-medium">Entry fee</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-gray-900">₹{selectedAttraction.price?.toLocaleString()}</span>
                      <span className="text-xs text-gray-400">/person</span>
                    </div>
                    <p className="text-[11px] text-emerald-600 font-medium">Free cancellation</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Attractions;
