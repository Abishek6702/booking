/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation, useParams } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Star as StarIcon,
  MapPin as MapPinIcon,
  Wifi, Waves, Car, Dumbbell, Wind, UtensilsCrossed, Eye, Shield, Calendar, Users,
  ChevronLeft, ChevronRight, Heart, Loader2 as SpinnerIcon,
  Sparkles, ArrowRight, CheckCircle2 as VerifiedIcon, CheckCircle,
  Clock, Ban, Coffee, Snowflake, Tv, Phone, BedDouble, Bath,
  Info, Bike, Mountain, TreePine, Square,
  Compass, PawPrint, Flame, Gamepad, Shirt, Briefcase, Utensils, Anchor, Palmtree, Activity, Laptop,
} from "lucide-react";
import resort1 from "@/assets/resort1.jpg";
import resort2 from "@/assets/resort2.jpg";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/sonner";
import { useFavorites } from "@/context/FavoritesContext";
import { getAmenityIcon } from "@/utils/amenityIcons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";



const AMENITY_TIMINGS: Record<string, string> = {
  "Swimming Pool": "06:00 - 22:00",
  "Pool": "06:00 - 22:00",
  "swimming pool": "08:00 - 22:00",
  "pool": "08:00 - 22:00",
  "Outdoor Pool": "06:00 - 20:00",
  "Indoor Pool": "07:00 - 23:00",
  "Gym": "05:00 - 23:00",
  "gym": "06:00 - 23:00",
  "Fitness Center": "05:00 - 23:00",
  "fitness center": "06:00 - 23:00",
  "Spa": "09:00 - 21:00",
  "spa": "09:00 - 21:00",
  "Massage Center": "09:00 - 20:00",
  "Restaurant": "07:00 - 23:00",
  "restaurant": "07:00 - 23:00",
  "Cafe": "08:00 - 22:00",
  "Bar": "11:00 - 02:00",
  "bar": "11:00 - 01:00",
  "Pool Bar": "10:00 - 20:00",
  "Snack Bar": "10:00 - 18:00",
  "Lounge": "10:00 - 01:00",
  "Breakfast": "07:00 - 10:30",
  "breakfast": "07:00 - 10:30",
  "Breakfast Included": "07:00 - 10:30",
  "Kids Play Area": "09:00 - 19:00",
  "Kids Club": "09:00 - 18:00",
  "Game Room": "10:00 - 22:00",
  "Tennis Court": "07:00 - 21:00",
  "Badminton Court": "07:00 - 21:00",
  "Basketball Court": "07:00 - 21:00",
  "Cinema": "15:00 - 23:00",
  "Nightclub": "22:00 - 04:00",
  "concierge service": "00:00 - 24:00",
  "24-hour front desk": "00:00 - 24:00",
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80&w=800",
];

const today = new Date();
const checkInDate = new Date(today); checkInDate.setDate(today.getDate() + 7);
const checkOutDate = new Date(today); checkOutDate.setDate(today.getDate() + 10);
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const dateToInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const HOUSE_RULES = [
  { icon: Clock, label: "Check-in", value: "3:00 PM – 11:00 PM" },
  { icon: Clock, label: "Check-out", value: "Before 11:00 AM" },
  { icon: Ban, label: "Smoking", value: "Not allowed" },
  { icon: Users, label: "Parties", value: "Not allowed" },
  { icon: Users, label: "Pets", value: "Not allowed" },
];

const NEARBY = [
  { icon: Coffee, label: "Café Milano", dist: "200m" },
  { icon: Mountain, label: "Heritage Trail", dist: "1.2km" },
  { icon: Bike, label: "Cycle Track", dist: "400m" },
  { icon: TreePine, label: "City Park", dist: "600m" },
];

const StayDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlGuests = parseInt(searchParams.get("guests") || "2");
  const urlCheckIn = searchParams.get("checkIn");
  const urlCheckOut = searchParams.get("checkOut");

  const { isFavorite, toggleFavorite } = useFavorites();
  const { isLoggedIn } = useAuth();

  const [stay, setStay] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const REVIEWS_PER_PAGE = 5;

  // Review-writing eligibility for the current user
  const [reviewableBookingId, setReviewableBookingId] = useState<string | null>(null);
  const [hasAlreadyReviewed, setHasAlreadyReviewed] = useState(false);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, title: "", comment: "" });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [isAmenitiesOpen, setIsAmenitiesOpen] = useState(false);
  const [roomGalleryImages, setRoomGalleryImages] = useState<string[] | null>(null);
  // Map of roomId -> number of rooms still available for selected dates
  const [roomAvailability, setRoomAvailability] = useState<Record<string, number>>({});

  const urlAdults = searchParams.has("adults") ? parseInt(searchParams.get("adults") as string) : urlGuests;
  const urlChildren = searchParams.has("children") ? parseInt(searchParams.get("children") as string) : 0;
  
  const [guests, setGuests] = useState({ adults: urlAdults > 1 ? urlAdults : 2, children: urlChildren });
  const [roomCount, setRoomCount] = useState(1);
  const initCheckIn = urlCheckIn ? new Date(urlCheckIn) : checkInDate;
  const initCheckOut = urlCheckOut ? new Date(urlCheckOut) : checkOutDate;
  const [checkIn, setCheckIn] = useState(initCheckIn);
  const [checkOut, setCheckOut] = useState(initCheckOut);
  const [editCheckIn, setEditCheckIn] = useState(dateToInput(initCheckIn));
  const [editCheckOut, setEditCheckOut] = useState(dateToInput(initCheckOut));
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const [stayRes, roomsRes, reviewsRes] = await Promise.all([
          api.get(`/stays/${id}`),
          api.get(`/stays/${id}/rooms`),
          api.get(`/reviews?itemId=${id}&itemType=stay&page=1&limit=5`),
        ]);
        const stayData = stayRes.data.data;
        
        // Robust image normalization
        const rawImages = Array.isArray(stayData.images) ? stayData.images : [];
        const validImages = rawImages.filter(img => typeof img === 'string' && img.trim() !== "");
        
        const normalizedImages = validImages.length > 0 ? [...validImages] : [FALLBACK_IMAGES[0]];
        
        // Ensure at least 4 images for the gallery
        while (normalizedImages.length < 4) {
          normalizedImages.push(FALLBACK_IMAGES[normalizedImages.length % FALLBACK_IMAGES.length]);
        }

        // Normalize: backend uses 'title', 'avgRating', 'totalReviews' — alias to expected frontend names
        setStay({
          ...stayData,
          images: normalizedImages,
          name: stayData.title || stayData.name || "Unnamed Property",
          rating: Number(stayData.avgRating) || stayData.rating || 0,
          reviewsCount: stayData.totalReviews || stayData.reviewsCount || 0,
        });

        const rawRooms = Array.isArray(roomsRes.data.data) ? roomsRes.data.data : [];
        // Normalize room fields and filter by Active status
        const normalizedRooms = rawRooms
          .filter((r: any) => {
            // Respect the owner's status setting; default to Active if not set
            const status = r.options?.status || "Active";
            return status === "Active";
          })
          .map((r: any) => ({
            ...r,
            pricePerNight: r.pricePerNight || 0,
            capacity: r.capacity || { adults: r.maxGuests || 2, children: 0 },
            features: r.features || r.amenities || [],
          }));
        setRooms(normalizedRooms);
        // Backend returns paginated { page, limit, total, totalPages, reviews }
        const reviewsData = reviewsRes.data.data;
        const reviewsList = Array.isArray(reviewsData)
          ? reviewsData
          : (reviewsData?.reviews ?? []);
        setReviews(reviewsList);
        setReviewsTotal(
          Array.isArray(reviewsData) ? reviewsList.length : (reviewsData?.total ?? reviewsList.length),
        );
        if (normalizedRooms.length > 0) {
          const firstRoom = normalizedRooms[0];
          setSelectedRoomId(firstRoom.id);
          const roomMaxAdults = firstRoom.options?.occupancy?.maxAdults || firstRoom.maxGuests || 2;
          const requiredRooms = Math.ceil((urlAdults > 1 ? urlAdults : 2) / roomMaxAdults);
          setRoomCount(Math.max(1, requiredRooms));
        }
      } catch (error: any) {
        if (error.response?.status === 404) setStay(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!selectedRoomId || !checkIn || !checkOut || !id) return;
      try {
        const res = await api.post("/bookings/preview", {
          type: "stay", stayId: id, roomId: selectedRoomId,
          checkIn: checkIn.toISOString(), checkOut: checkOut.toISOString(),
          guests, guestDetails: { roomCount }
        });
        if (res.data.success) setPreview(res.data.data);
      } catch { /* silent */ }
    };
    fetchPreview();
  }, [selectedRoomId, checkIn, checkOut, guests, roomCount, id, stay]);

  // Fetch real availability for each room whenever rooms list or dates change
  useEffect(() => {
    const fetchRoomAvailability = async () => {
      if (!id || rooms.length === 0 || !checkIn || !checkOut) return;
      const results: Record<string, number> = {};
      await Promise.all(
        rooms.map(async (r: any) => {
          try {
            const totalRooms = r.options?.availability?.availableRooms ||
                               r.options?.availability?.totalRooms || 1;
            const res = await api.get(
              `/stays/${id}/rooms/${r.id}/availability`,
              { params: { start: checkIn.toISOString(), end: checkOut.toISOString() } }
            );
            const booked = res.data?.data?.overlappingBookings ?? 0;
            results[r.id] = Math.max(0, totalRooms - booked);
          } catch {
            // On error, fall back to owner-set total
            results[r.id] = r.options?.availability?.availableRooms ||
                             r.options?.availability?.totalRooms || 1;
          }
        })
      );
      setRoomAvailability(results);
    };
    fetchRoomAvailability();
  }, [id, rooms, checkIn, checkOut]);

  // Determine if the logged-in user can leave a review for this stay.
  // Reviews can only be created for COMPLETED bookings that haven't been reviewed yet.
  useEffect(() => {
    const checkEligibility = async () => {
      if (!isLoggedIn || !id) {
        setReviewableBookingId(null);
        setHasAlreadyReviewed(false);
        return;
      }
      try {
        const [bookingsRes, myReviewsRes] = await Promise.all([
          api.get("/profile/bookings?page=1&limit=100"),
          api.get("/profile/reviews"),
        ]);

        const myBookings: Array<{ id: string; stayId?: string; status?: string }> =
          bookingsRes.data.data?.bookings ?? [];

        const completedForThisStay = myBookings
          .filter((b) => b.stayId === id && (b.status ?? "").toLowerCase() === "completed");

        const reviewsData = myReviewsRes.data.data;
        const myReviews: Array<{ bookingId?: string }> = Array.isArray(reviewsData)
          ? reviewsData
          : (reviewsData?.reviews ?? []);
        const reviewedBookingIds = new Set(myReviews.map((r) => r.bookingId).filter(Boolean));

        const unreviewed = completedForThisStay.find((b) => !reviewedBookingIds.has(b.id));
        const alreadyReviewedThisStay = completedForThisStay.some((b) => reviewedBookingIds.has(b.id));

        setReviewableBookingId(unreviewed?.id ?? null);
        setHasAlreadyReviewed(alreadyReviewedThisStay && !unreviewed);
      } catch (error) {
        console.error("Failed to check review eligibility", error);
      }
    };
    checkEligibility();
  }, [id, isLoggedIn]);

  const handleSaveDates = () => {
    if (!editCheckIn || !editCheckOut) return;
    const [yi, mi, di] = editCheckIn.split("-").map(Number);
    const [yo, mo, doo] = editCheckOut.split("-").map(Number);
    const ni = new Date(yi, mi - 1, di);
    const no = new Date(yo, mo - 1, doo);
    if (no > ni) { setCheckIn(ni); setCheckOut(no); setIsEditingDates(false); }
    else toast.error("Check-out must be after check-in.");
  };

  const fetchReviewsPage = async (page: number) => {
    if (!id) return;
    try {
      setIsLoadingReviews(true);
      const res = await api.get(
        `/reviews?itemId=${id}&itemType=stay&page=${page}&limit=${REVIEWS_PER_PAGE}`,
      );
      const data = res.data.data;
      const list = Array.isArray(data) ? data : (data?.reviews ?? []);
      const totalPages = Array.isArray(data)
        ? Math.max(1, Math.ceil(list.length / REVIEWS_PER_PAGE))
        : (data?.totalPages ?? 1);
      setAllReviews(list);
      setReviewsPage(page);
      setReviewsTotalPages(totalPages);
    } catch (error) {
      console.error("Failed to load reviews", error);
      toast.error("Failed to load reviews");
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const openReviewsModal = () => {
    setIsReviewsOpen(true);
    fetchReviewsPage(1);
  };

  const submitReview = async () => {
    if (!reviewableBookingId || !id) return;

    const title = reviewDraft.title.trim();
    const comment = reviewDraft.comment.trim();

    if (reviewDraft.rating < 1 || reviewDraft.rating > 5) {
      toast.error("Please pick a rating between 1 and 5 stars");
      return;
    }
    if (!title) {
      toast.error("Please add a short review title");
      return;
    }
    if (!comment) {
      toast.error("Please describe your experience");
      return;
    }

    try {
      setIsSubmittingReview(true);
      await api.post("/reviews", {
        bookingId: reviewableBookingId,
        itemId: id,
        itemType: "stay",
        rating: reviewDraft.rating,
        title,
        comment,
      });
      toast.success("Thanks for your review!");
      setIsWriteReviewOpen(false);
      setReviewDraft({ rating: 5, title: "", comment: "" });

      // Mark this booking as reviewed locally and refresh visible reviews
      setReviewableBookingId(null);
      setHasAlreadyReviewed(true);
      try {
        const refreshed = await api.get(`/reviews?itemId=${id}&itemType=stay&page=1&limit=5`);
        const data = refreshed.data.data;
        const list = Array.isArray(data) ? data : (data?.reviews ?? []);
        setReviews(list);
        setReviewsTotal(Array.isArray(data) ? list.length : (data?.total ?? list.length));
      } catch { /* silent */ }
    } catch (error: unknown) {
      const message = error && typeof error === "object" && "response" in error
        ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message)
        : undefined;
      toast.error(message || "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReserve = () => {
    if (!isLoggedIn) { navigate("/login", { state: { from: location.pathname } }); return; }
    if (!selectedRoomId || !preview) { toast.error("Please select a room and valid dates."); return; }
    const room = rooms.find(r => r.id === selectedRoomId);
    navigate("/booking", {
      state: {
        type: "stay", stayId: id, roomId: selectedRoomId,
        propertyName: stay.name, propertyLocation: `${stay.city}, ${stay.country}`,
        roomName: room?.name || "Premium Suite",
        pricePerNight: room?.pricePerNight || stay.basePricePerNight,
        checkIn: checkIn.toISOString(), checkOut: checkOut.toISOString(),
        nights: preview.nights, guests, guestDetails: { roomCount },
        subtotal: preview.subtotal, taxes: preview.taxesAndFees, total: preview.totalAmount,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading property...</p>
      </div>
    );
  }

  if (!stay) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <h1 className="text-2xl font-black text-slate-900">Property Not Found</h1>
        <Button onClick={() => navigate("/stay")} className="bg-primary text-white rounded-xl px-6 h-9 text-xs font-bold">Back to Hotels</Button>
      </div>
    );
  }

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const isSaved = isFavorite(stay.id);
  const allImages = stay.images || [FALLBACK_IMAGES[0]];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />

      {/* ── Header ── */}
      <div className="container mx-auto px-4 pt-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">{stay.type || "Hotel"}</span>
              {stay.isVerified && <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><VerifiedIcon className="h-2.5 w-2.5" />Verified</span>}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">{stay.name}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <MapPinIcon className="h-3 w-3 text-primary" />
              {stay.address && `${stay.address}, `}{stay.city}, {stay.country}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
              <span className="text-lg font-black text-slate-900">{stay.rating || "5.0"}</span>
              <div>
                <div className="flex gap-0.5 mb-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className={`h-2.5 w-2.5 ${i < Math.floor(stay.rating || 5) ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}`} />
                  ))}
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{reviewsTotal} reviews</p>
              </div>
            </div>
            <button
              onClick={() => toggleFavorite({
                id: stay.id,
                title: stay.name || stay.title,
                image: allImages[0],
                location: `${stay.city}, ${stay.country}`,
                rating: stay.rating || 0,
                reviews: reviews.length,
                price: stay.basePricePerNight || selectedRoom?.pricePerNight || 0,
                amenities: stay.amenities || [],
                type: stay.type || "HOTEL",
                cancellable: true,
              })}
              className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm hover:scale-105 transition-all"
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-rose-500 text-rose-500" : "text-slate-300"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Gallery ── */}
      <div className="container mx-auto px-4 pb-6">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[280px] rounded-2xl overflow-hidden relative">
          {/* Main large image */}
          <div className="col-span-2 row-span-2 relative cursor-pointer group overflow-hidden" onClick={() => setIsGalleryOpen(true)}>
            <img
              src={allImages[0]}
              alt={stay.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES[0]; }}
            />
          </div>
          {/* Side images */}
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="relative cursor-pointer group overflow-hidden" onClick={() => setIsGalleryOpen(true)}>
              <img
                src={allImages[idx] || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]}
                alt={`${stay.name} ${idx}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]; }}
              />
              {idx === 3 && allImages.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <p className="text-white font-black text-sm">+{allImages.length - 4} more</p>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-slate-800 rounded-xl px-4 h-8 text-[10px] font-bold uppercase tracking-widest hover:bg-white shadow-md transition-all"
          >
            View all photos
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8 pb-8 lg:pr-2">

            {/* Description */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">About this property</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{stay.description}</p>

              {/* Quick highlights */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-50">
                <div className="text-center">
                  <BedDouble className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{rooms.length} Rooms</p>
                </div>
                <div className="text-center">
                  <Users className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Max {guests.adults + 2} Guests</p>
                </div>
                <div className="text-center">
                  <Bath className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">En-Suite Bath</p>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amenities & Facilities</h4>
                {(stay.amenities || []).length > 9 && (
                  <button 
                    onClick={() => setIsAmenitiesOpen(true)}
                    className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    Show all {(stay.amenities || []).length}
                  </button>
                )}
              </div>
              <TooltipProvider>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(stay.amenities || []).slice(0, 9).map((a: string) => {
                    const Icon = getAmenityIcon(a);
                    const timing = stay.policies?.amenityHours?.[a] || stay.policies?.amenityTimings?.[a] || AMENITY_TIMINGS[a] || AMENITY_TIMINGS[Object.keys(AMENITY_TIMINGS).find(k => k.toLowerCase() === a.toLowerCase()) || ""];
                    
                    const content = (
                      <div key={a} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-primary/5 transition-colors group relative cursor-help">
                        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-primary border border-slate-100 flex-shrink-0">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-1">{a}</span>
                        {timing && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary/20 rounded-full" />}
                      </div>
                    );

                    if (timing) {
                      return (
                        <Tooltip key={a}>
                          <TooltipTrigger asChild>
                            {content}
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-slate-900 text-white border-slate-800 rounded-lg py-2 px-3 shadow-xl z-[100]">
                            <div className="flex flex-col gap-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Hours of Operation</p>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-primary" />
                                <p className="text-xs font-bold">{timing}</p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                    return content;
                  })}
                </div>
              </TooltipProvider>
              {(stay.amenities || []).length > 9 && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsAmenitiesOpen(true)}
                  className="w-full mt-4 h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Show all {(stay.amenities || []).length} amenities
                </Button>
              )}
            </div>

            {/* Rooms Table Layout */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Rooms</h4>
                <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">{rooms.length} room types</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                      <th className="p-4 w-1/4 rounded-tl-xl border-r border-slate-200">Room Type</th>
                      <th className="p-4 border-r border-slate-200">Number of Guests</th>
                      <th className="p-4 border-r border-slate-200">Price per night</th>
                      <th className="p-4 border-r border-slate-200">Your Choices</th>
                      <th className="p-4 rounded-tr-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-4 divide-slate-100 border-t-0">
                    {rooms.map(r => {
                      const opts = r.options || {};
                      // The new structure is an object with occupancy/policies. 
                      // If it's an array, it's legacy or mock data.
                      const hasNewStructure = !Array.isArray(opts) && (opts.occupancy || opts.policies || opts.beds);

                      let options: any[] = [];
                      if (hasNewStructure) {
                        // Priority 1: New Structured Data (Single Option as defined by owner)
                        options = [{
                          id: 'opt1',
                          adults: opts.occupancy?.maxAdults || r.maxGuests || 2,
                          children: opts.occupancy?.maxChildren || 0,
                          priceMult: 1,
                          choices: [
                            opts.policies?.breakfastIncluded ? `Breakfast included (${opts.policies.breakfastType})` : "Room only",
                            opts.policies?.freeCancellation ? `Free cancellation before ${opts.policies.cancellationDeadline}h` : "Non-refundable",
                            opts.policies?.noPrepayment ? "No prepayment needed" : null,
                            opts.policies?.payAtProperty ? "Pay at property" : null,
                            opts.policies?.noCreditCard ? "No credit card needed" : null,
                          ].filter(Boolean)
                        }];
                      } else if (Array.isArray(opts) && opts.length > 0) {
                        // Priority 2: Legacy Array Data — use only the first option to avoid duplicate rows
                        options = [opts[0]];
                      } else {
                        // Priority 3: Minimal Fallback
                        options = [{
                          id: 'opt1',
                          adults: r.maxGuests || 2,
                          children: 0,
                          priceMult: 1,
                          choices: ["Standard booking"]
                        }];
                      }

                      return (
                        <React.Fragment key={r.id}>
                          {options.map((opt, i) => {
                            const nights = preview?.nights || Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));
                            const optionPrice = (r.pricePerNight || stay.basePricePerNight) * (opt.priceMult || 1);
                            const totalPrice = optionPrice * nights;
                            const taxes = totalPrice * 0.12; // 12% tax (standard)
                            const isSelected = selectedRoomId === r.id;
                            
                            return (
                              <tr 
                                key={`${r.id}-${opt.id}`} 
                                onClick={() => {
                                  setSelectedRoomId(r.id);
                                  // Auto-calculate room count based on selected guests and room capacity
                                  const roomMaxAdults = r.options?.occupancy?.maxAdults || r.maxGuests || 2;
                                  const requiredRooms = Math.ceil(guests.adults / roomMaxAdults);
                                  setRoomCount(Math.max(1, requiredRooms));
                                }}
                                className={`border-b border-slate-200 last:border-0 hover:bg-slate-50/50 transition-colors cursor-pointer ${isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`}
                              >
                                {i === 0 && (
                                  <td rowSpan={options.length} className={`p-4 align-top border-r border-slate-200 bg-white ${isSelected ? "!bg-primary/5" : ""}`}>
                                     <div className="space-y-3">
                                       <h3 className="text-lg font-black text-primary tracking-tight leading-none hover:underline">{r.name}</h3>
                                       <div className="flex flex-col gap-2">
                                         <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                           <BedDouble className="h-3.5 w-3.5 text-primary" /> 
                                           {hasNewStructure ? `${opts.beds?.numBeds || 1} ${r.bedType}` : (r.bedType || "1 Double Bed")}
                                         </span>
                                         <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                           <Square className="h-3.5 w-3.5 text-primary" /> 
                                           {hasNewStructure ? `${opts.roomSize || "28"} m²` : "28 m²"}
                                         </span>
                                         {hasNewStructure && opts.views && opts.views.length > 0 && (
                                           <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                                             <Waves className="h-3.5 w-3.5" /> {opts.views.join(", ")}
                                           </span>
                                         )}
                                       </div>
                                       <div className="pt-2 border-t border-slate-100">
                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Room Amenities</p>
                                         <div className="grid grid-cols-1 gap-y-1">
                                           {(r.amenities || []).slice(0,6).map((f: string) => (
                                             <span key={f} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                                               <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />{f}
                                             </span>
                                           ))}
                                         </div>
                                       </div>
                                       <div className="mt-3 inline-block bg-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-black text-primary uppercase cursor-pointer hover:bg-slate-200 transition-colors" onClick={(e) => { e.stopPropagation(); setRoomGalleryImages(opts.images || r.images || [FALLBACK_IMAGES[1]]); }}>
                                         View Photos
                                       </div>
                                     </div>
                                  </td>
                                )}
                                <td className="p-4 align-top border-r border-slate-200">
                                  <div className="flex items-center gap-0.5 flex-wrap max-w-[80px]">
                                    {Array.from({length: Math.min(opt.adults, 4)}).map((_, idx) => <Users key={`a-${idx}`} className="h-4 w-4 text-slate-700" />)}
                                    {opt.adults > 4 && <span className="text-xs font-black text-slate-700">+{opt.adults - 4}</span>}
                                    {opt.children > 0 && <span className="text-xs font-black text-slate-400 ml-1">+ {opt.children} <Users className="h-3 w-3 inline text-slate-400" /></span>}
                                  </div>
                                  <p className="text-[9px] font-bold text-slate-500 mt-2">Max {opt.adults} adults{opt.children > 0 ? `, ${opt.children} children` : ""}</p>
                                </td>
                                <td className="p-4 align-top border-r border-slate-200">
                                  <p className="text-xl font-black text-slate-900 leading-none">₹{optionPrice.toLocaleString()}</p>
                                  <p className="text-[9px] text-slate-500 mt-1">Includes ₹{Math.round(optionPrice * 0.15).toLocaleString()} taxes & fees</p>
                                  {(() => {
                                    const roomsLeft = roomAvailability[r.id] ?? (hasNewStructure ? (opts.availability?.availableRooms || 1) : 1);
                                    return roomsLeft > 1 ? (
                                      <p className="text-[9px] text-emerald-600 font-bold mt-2 flex items-center gap-1"><CheckCircle className="h-3 w-3"/>{roomsLeft} rooms left</p>
                                    ) : null;
                                  })()}
                                </td>
                                <td className="p-4 align-top border-r border-slate-200">
                                  <ul className="space-y-1.5">
                                    {(opt.choices || []).map((choice: string) => (
                                      <li key={choice} className={`text-[10px] font-bold flex flex-col gap-0.5 ${(choice.includes('Free cancellation') || choice.includes('Breakfast')) ? 'text-emerald-700' : 'text-slate-700'}`}>
                                        <span className="flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" /> {choice}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                                <td className="p-4 align-top text-center">
                                  <Button 
                                    variant={isSelected ? "default" : "outline"}
                                    className={`w-full rounded-xl h-10 font-black text-[10px] uppercase tracking-widest transition-all ${isSelected ? "bg-primary shadow-lg shadow-primary/20 scale-105" : "border-slate-200 text-slate-400 hover:border-primary hover:text-primary"}`}
                                  >
                                    {isSelected ? <><CheckCircle className="h-3.5 w-3.5 mr-2" /> Selected</> : "Select Room"}
                                  </Button>
                                  {isSelected && (
                                    <p className="text-[8px] font-black text-primary uppercase mt-2 animate-pulse">Proceed to sidebar</p>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Reviews</h4>
                <div className="flex items-center gap-1.5">
                  <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-black text-slate-900">{stay.rating || "5.0"}</span>
                  <span className="text-[9px] text-slate-400">({reviewsTotal} reviews)</span>
                </div>
              </div>

              {/* Write-a-review CTA — shown only when the user has a completed unreviewed booking for this stay */}
              {reviewableBookingId && (
                <div className="mb-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <StarIcon className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">You've stayed here</p>
                      <p className="text-[10px] text-amber-700 font-bold truncate">Share your experience with future guests</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsWriteReviewOpen(true)}
                    className="rounded-lg h-9 px-4 text-[10px] font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0"
                  >
                    Write a Review
                  </Button>
                </div>
              )}

              {/* Already-reviewed indicator */}
              {hasAlreadyReviewed && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">You've already reviewed this property</p>
                </div>
              )}

              {/* Login prompt when not logged in */}
              {!isLoggedIn && reviews.length === 0 && (
                <div className="mb-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-600">Stayed here? Log in to write a review.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/login", { state: { from: location.pathname } })}
                    className="rounded-lg h-9 px-4 text-[10px] font-black uppercase tracking-widest flex-shrink-0"
                  >
                    Log in
                  </Button>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No reviews yet. Be the first!</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {reviews.slice(0, 3).map((rv) => (
                      <div key={rv.id} className="p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-slate-800">{rv.user?.name || "Guest"}</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <StarIcon key={i} className={`h-2.5 w-2.5 ${i < rv.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}`} />
                            ))}
                          </div>
                        </div>
                        {rv.title && <p className="text-xs font-black text-slate-700 mb-1">{rv.title}</p>}
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{rv.comment}</p>
                        <p className="text-[9px] text-slate-400 mt-1">{new Date(rv.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                      </div>
                    ))}
                  </div>
                  {reviewsTotal > 3 && (
                    <Button
                      variant="outline"
                      onClick={openReviewsModal}
                      className="w-full mt-4 h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      View all {reviewsTotal} reviews
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* House Rules */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">House Rules</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                  <Clock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Check-in</p>
                    <p className="text-[10px] font-bold text-slate-700">{stay.policies?.checkIn || "3:00 PM – 11:00 PM"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                  <Clock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Check-out</p>
                    <p className="text-[10px] font-bold text-slate-700">{stay.policies?.checkOut || "Before 11:00 AM"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                  <Ban className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Smoking</p>
                    <p className="text-[10px] font-bold text-slate-700">Not allowed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                  <Users className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Parties & Pets</p>
                    <p className="text-[10px] font-bold text-slate-700">Not allowed</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-700">Free cancellation up to 48 hours before check-in. After that, the first night is non-refundable.</p>
                </div>
              </div>
            </div>

            {/* Location & Nearby */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-6">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Property Location</h4>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-3 hover:border-primary/30 transition-all">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPinIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-snug mb-1">{stay.address || `${stay.city}, ${stay.country}`}</p>
                    <p className="text-xs font-medium text-slate-500">{stay.city}, {stay.country}</p>
                    <a 
                      href={Number(stay.latitude) !== 0 && Number(stay.longitude) !== 0 
                        ? `https://www.google.com/maps/search/?api=1&query=${stay.latitude},${stay.longitude}`
                        : `https://maps.google.com/?q=${encodeURIComponent((stay.address || "") + " " + stay.city + " " + stay.country)}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[10px] font-black text-primary uppercase tracking-widest mt-2 flex items-center gap-1 hover:underline"
                    >
                      View on Map <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">What's Nearby</h4>
                <div className="grid grid-cols-2 gap-3">
                  {NEARBY.map((item) => (
                    <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-sm transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                        <item.icon className="h-4 w-4 text-slate-500 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 leading-tight">{item.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.dist} away</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Booking Sidebar ── */}
          <div className="lg:sticky lg:top-24 pb-8 lg:pl-1">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {preview ? "Total Stay Price" : "Price from"}
                  </p>
                  <div className="flex flex-col">
                    <p className="text-2xl font-black text-slate-900">
                      ₹{(preview?.totalAmount || selectedRoom?.pricePerNight || stay.basePricePerNight || 0).toLocaleString()}
                    </p>
                    {preview ? (
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        ₹{(selectedRoom?.pricePerNight || stay.basePricePerNight || 0).toLocaleString()} × {preview.nights} nights
                      </p>
                    ) : (
                      <p className="text-[9px] text-slate-400">per night</p>
                    )}
                  </div>
                </div>
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>

              {selectedRoom && (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Selected Room</p>
                  <p className="text-sm font-black text-slate-800 leading-tight">{selectedRoom.name}</p>
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <BedDouble className="h-3 w-3" /> {selectedRoom.bedType}
                  </p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="bg-slate-50 rounded-xl p-3 border border-slate-100 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setIsEditingDates(true)}
                >
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Check-in</p>
                  <p className="text-[10px] font-bold text-slate-800">{fmt(checkIn)}</p>
                </div>
                <div
                  className="bg-slate-50 rounded-xl p-3 border border-slate-100 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setIsEditingDates(true)}
                >
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Check-out</p>
                  <p className="text-[10px] font-bold text-slate-800">{fmt(checkOut)}</p>
                </div>
              </div>

              {/* Guests */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-700">Adults</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setGuests(g => ({ ...g, adults: Math.max(1, g.adults - 1) }))} className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 text-xs font-bold hover:text-primary transition-colors">-</button>
                    <span className="text-xs font-black w-3 text-center">{guests.adults}</span>
                    <button onClick={() => setGuests(g => ({ ...g, adults: g.adults + 1 }))} className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 text-xs font-bold hover:text-primary transition-colors">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-700">Children</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setGuests(g => ({ ...g, children: Math.max(0, g.children - 1) }))} className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 text-xs font-bold hover:text-primary transition-colors">-</button>
                    <span className="text-xs font-black w-3 text-center">{guests.children}</span>
                    <button onClick={() => setGuests(g => ({ ...g, children: g.children + 1 }))} className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 text-xs font-bold hover:text-primary transition-colors">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  {(() => {
                    const availNow = selectedRoom ? (roomAvailability[selectedRoom.id] ?? (selectedRoom?.options?.availability?.totalRooms || selectedRoom?.options?.availability?.availableRooms || 10)) : 10;
                    return (
                      <>
                        <div className="flex flex-col">
                          <p className="text-[10px] font-bold text-slate-700">Rooms</p>
                          {availNow > 0 ? <p className="text-[8px] text-emerald-600 font-bold">{availNow} available</p> : <p className="text-[8px] text-red-500 font-bold">Not available</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <button disabled={availNow === 0} onClick={() => setRoomCount(r => Math.max(1, r - 1))} className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 text-xs font-bold hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">-</button>
                          <span className="text-xs font-black w-3 text-center">{availNow === 0 ? 0 : roomCount}</span>
                          <button disabled={availNow === 0} onClick={() => setRoomCount(r => Math.min(availNow, r + 1))} className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 text-xs font-bold hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Price breakdown */}
              {preview && (
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>₹{(selectedRoom?.pricePerNight || stay.basePricePerNight)?.toLocaleString()} × {preview.nights} nights</span>
                    <span className="text-slate-800">₹{preview.subtotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Taxes & fees (15%)</span>
                    <span className="text-slate-800">₹{preview.taxesAndFees?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-black text-slate-900">Total</span>
                    <span className="text-base font-black text-primary">₹{preview.totalAmount?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {(() => {
                const roomMaxAdults = selectedRoom?.options?.occupancy?.maxAdults || selectedRoom?.maxGuests || 2;
                const isOverCapacity = guests.adults > (roomMaxAdults * roomCount);
                return (
                  <Button
                    onClick={handleReserve}
                    disabled={!preview || isOverCapacity}
                    className="w-full bg-primary text-white hover:bg-primary/90 rounded-xl h-12 font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isOverCapacity ? "Exceeds Capacity" : `Reserve Now ${preview ? `· ₹${preview.totalAmount.toLocaleString()}` : ""}`} 
                    {!isOverCapacity && <ArrowRight className="h-4 w-4 ml-2" />}
                  </Button>
                );
              })()}
              <p className="text-[9px] text-slate-400 text-center">You won't be charged yet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Write Review Dialog */}
      <Dialog
        open={isWriteReviewOpen}
        onOpenChange={(open) => {
          setIsWriteReviewOpen(open);
          if (!open) setReviewDraft({ rating: 5, title: "", comment: "" });
        }}
      >
        <DialogContent className="max-w-md rounded-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight mb-1">Write a Review</DialogTitle>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Share your experience at {stay?.name}
            </p>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewDraft((d) => ({ ...d, rating: s }))}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      reviewDraft.rating >= s
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "bg-slate-50 text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <StarIcon className={`h-5 w-5 ${reviewDraft.rating >= s ? "fill-white" : ""}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Review Title</p>
              <Input
                placeholder="Brief summary..."
                value={reviewDraft.title}
                onChange={(e) => setReviewDraft((d) => ({ ...d, title: e.target.value }))}
                maxLength={150}
                className="h-11 rounded-xl border-slate-200 bg-white font-bold"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Your Experience</p>
              <textarea
                placeholder="Tell us about your stay..."
                className="w-full h-32 p-4 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none"
                value={reviewDraft.comment}
                onChange={(e) => setReviewDraft((d) => ({ ...d, comment: e.target.value }))}
                maxLength={2000}
              />
              <p className="text-[9px] text-slate-400 text-right">{reviewDraft.comment.length}/2000</p>
            </div>
          </div>

          <DialogFooter className="mt-2 flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsWriteReviewOpen(false)}
              disabled={isSubmittingReview}
              className="h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={isSubmittingReview}
              className="h-11 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest"
            >
              {isSubmittingReview ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reviews Dialog (paginated) */}
      <Dialog open={isReviewsOpen} onOpenChange={setIsReviewsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black tracking-tight flex items-center gap-2">
              <StarIcon className="h-4 w-4 fill-amber-400 text-amber-400" />
              Guest Reviews
              <span className="text-xs font-bold text-slate-400">({reviewsTotal} total)</span>
            </DialogTitle>
          </DialogHeader>

          {isLoadingReviews ? (
            <div className="flex items-center justify-center py-16">
              <SpinnerIcon className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : allReviews.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-8 text-center">No reviews yet.</p>
          ) : (
            <div className="space-y-3 mt-3">
              {allReviews.map((rv) => (
                <div key={rv.id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-black text-slate-800">{rv.user?.name || "Guest"}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {new Date(rv.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon key={i} className={`h-3 w-3 ${i < rv.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}`} />
                      ))}
                    </div>
                  </div>
                  {rv.title && <p className="text-sm font-black text-slate-800 mb-1">{rv.title}</p>}
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{rv.comment}</p>
                  {rv.ownerReply && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Owner reply</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{rv.ownerReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {reviewsTotalPages > 1 && (
            <DialogFooter className="mt-4 flex items-center justify-between sm:justify-between gap-2 border-t border-slate-100 pt-4">
              <Button
                variant="outline"
                disabled={reviewsPage <= 1 || isLoadingReviews}
                onClick={() => fetchReviewsPage(reviewsPage - 1)}
                className="h-9 px-4 rounded-lg text-xs font-bold"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
              </Button>
              <span className="text-xs font-bold text-slate-500">
                Page {reviewsPage} of {reviewsTotalPages}
              </span>
              <Button
                variant="outline"
                disabled={reviewsPage >= reviewsTotalPages || isLoadingReviews}
                onClick={() => fetchReviewsPage(reviewsPage + 1)}
                className="h-9 px-4 rounded-lg text-xs font-bold"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Gallery Dialog */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader><DialogTitle className="text-base font-black tracking-tight">Photo Gallery</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {allImages.map((src: string, idx: number) => (
              <div key={idx} className="aspect-video rounded-xl overflow-hidden">
                <img
                  src={src}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]; }}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Gallery Dialog */}
      <Dialog open={!!roomGalleryImages} onOpenChange={(open) => !open && setRoomGalleryImages(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader><DialogTitle className="text-base font-black tracking-tight">Room Gallery</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {roomGalleryImages?.map((src: string, idx: number) => (
              <div key={idx} className="aspect-video rounded-xl overflow-hidden">
                <img
                  src={src}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]; }}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dates Dialog */}
      <Dialog open={isEditingDates} onOpenChange={setIsEditingDates}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-sm font-black">Edit Dates</DialogTitle></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Check-in</p>
              <Input type="date" value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)} className="h-9 rounded-xl text-xs" />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Check-out</p>
              <Input type="date" value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)} className="h-9 rounded-xl text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditingDates(false)} className="rounded-xl h-8 text-xs">Cancel</Button>
            <Button onClick={handleSaveDates} className="bg-primary text-white rounded-xl h-8 text-xs px-6">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amenities Dialog */}
      <Dialog open={isAmenitiesOpen} onOpenChange={setIsAmenitiesOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight mb-4">Amenities & Facilities</DialogTitle>
          </DialogHeader>
          <TooltipProvider>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(stay.amenities || []).map((a: string) => {
                const Icon = getAmenityIcon(a);
                const timing = stay.policies?.amenityTimings?.[a] || AMENITY_TIMINGS[a] || AMENITY_TIMINGS[Object.keys(AMENITY_TIMINGS).find(k => k.toLowerCase() === a.toLowerCase()) || ""];
                
                const content = (
                  <div key={a} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-primary/20 transition-all relative cursor-help">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-primary border border-slate-100 flex-shrink-0 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 leading-tight">{a}</span>
                    {timing && <div className="absolute top-2 right-2 w-2 h-2 bg-primary/20 rounded-full" />}
                  </div>
                );

                if (timing) {
                  return (
                    <Tooltip key={a}>
                      <TooltipTrigger asChild>
                        {content}
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-slate-900 text-white border-slate-800 rounded-lg py-2 px-3 shadow-xl z-[100]">
                        <div className="flex flex-col gap-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Hours of Operation</p>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-primary" />
                            <p className="text-xs font-bold">{timing}</p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return content;
              })}
            </div>
          </TooltipProvider>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default StayDetails;
