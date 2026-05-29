/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Home, CalendarCheck, Heart, Star, Settings, Plane,
  CheckCircle, MapPin, Calendar, User,
  Bell, ShieldCheck, LogOut, MessageSquare,
  X, Menu, Edit2, Clock, CreditCard, Car, ArrowRight, UserCheck, ArrowLeft, Loader2, Sparkles, LayoutDashboard, Compass
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import api from "@/lib/api";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Section = "overview" | "bookings" | "saved" | "reviews" | "settings";
type BookingTab = "active" | "completed" | "cancelled";
type BookingKind = "all" | "stay" | "vehicle";

type BookingRecord = {
   id: string;
   type?: string;
   status?: string;
   totalAmount?: number;
   checkIn?: string;
   checkOut?: string;
   createdAt?: string;
   stayId?: string;
   vehicleId?: string;
   attractionId?: string;
   pickupAddress?: string | null;
   dropoffAddress?: string | null;
   vehicleServiceMode?: string | null;
   vehicleDistanceKm?: number | null;
   stay?: {
      name?: string;
      city?: string;
      location?: string;
      images?: string[];
   };
   vehicle?: {
      brand?: string;
      model?: string;
      name?: string;
      location?: string;
   };
};

type ReviewRecord = {
   id: string;
   bookingId?: string;
   stay?: { name?: string };
   rating: number;
   comment: string;
   createdAt: string;
};

type ReviewDraft = BookingRecord & {
   rating?: number;
   title?: string;
   comment?: string;
};

type BookingMetrics = {
   total: number;
   active: number;
   completed: number;
   cancelled: number;
   spend: number;
   upcoming: BookingRecord[];
};

const ACTIVE_BOOKING_STATUSES = new Set([
   "hold",
   "pending",
   "payment_pending",
   "paid",
   "driver_accepted",
   "arrived",
   "ongoing",
   "in_progress",
   "completion_pending_confirmation",
   "confirmed",
   "processing",
]);

const COMPLETED_BOOKING_STATUSES = new Set(["completed"]);
const CANCELLED_BOOKING_STATUSES = new Set(["cancelled", "failed", "rejected"]);

const formatCurrency = (value?: number | null) =>
   new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

const formatBookingDate = (value?: string | Date | null) => {
   if (!value) return "TBA";
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return "TBA";
   return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const getNormalizedBookingType = (booking: BookingRecord) => String(booking.type ?? "").toLowerCase();

const toTimestamp = (value?: string | Date | null) => {
   if (!value) return null;
   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? null : date.getTime();
};

const getBookingStatusMeta = (status?: string) => {
   const normalized = (status ?? "draft").toLowerCase();
   if (COMPLETED_BOOKING_STATUSES.has(normalized)) {
      return {
         label: "Completed",
         className: "border-emerald-200 bg-emerald-50 text-emerald-700",
         dotClassName: "bg-emerald-500",
         description: "Trip finished",
      };
   }

   if (CANCELLED_BOOKING_STATUSES.has(normalized)) {
      return {
         label: "Cancelled",
         className: "border-rose-200 bg-rose-50 text-rose-700",
         dotClassName: "bg-rose-500",
         description: "Booking closed",
      };
   }

   if (normalized === "hold") {
      return {
         label: "On hold",
         className: "border-blue-200 bg-blue-50 text-blue-700",
         dotClassName: "bg-blue-500",
         description: "Finalizing booking",
      };
   }

   if (normalized === "payment_pending") {
      return {
         label: "Payment due",
         className: "border-amber-200 bg-amber-50 text-amber-700",
         dotClassName: "bg-amber-500",
         description: "Awaiting payment",
      };
   }

   if (normalized === "completion_pending_confirmation") {
      return {
         label: "Awaiting confirmation",
         className: "border-sky-200 bg-sky-50 text-sky-700",
         dotClassName: "bg-sky-500",
         description: "Final review pending",
      };
   }

   if (normalized === "confirmed") {
      return {
         label: "Confirmed",
         className: "border-primary/20 bg-primary/5 text-primary",
         dotClassName: "bg-primary",
         description: "Ready to travel",
      };
   }

   return {
      label: normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      className: "border-slate-200 bg-slate-50 text-slate-600",
      dotClassName: "bg-slate-400",
      description: "Booking record",
   };
};

const getBookingTitle = (booking: BookingRecord) => booking.stay?.name || booking.vehicle?.name || "Premium Journey";
const getBookingSubtitle = (booking: BookingRecord) => booking.stay?.city || booking.stay?.location || booking.vehicle?.location || "Curated travel experience";
const getBookingReference = (booking: BookingRecord) => (booking.id ? `#${booking.id.slice(-6).toUpperCase()}` : "DRAFT");
const getBookingTypeLabel = (booking: BookingRecord) => (getNormalizedBookingType(booking) === "vehicle" ? "Vehicle ride" : "Stay booking");
const getVehicleName = (booking: BookingRecord) => booking.vehicle?.name || [booking.vehicle?.brand, booking.vehicle?.model].filter(Boolean).join(" ") || "Vehicle booking";
const getVehicleRoute = (booking: BookingRecord) => {
   const parts = [booking.pickupAddress, booking.dropoffAddress].filter(Boolean);
   return parts.length > 0 ? parts.join(" → ") : "Pickup and drop-off pending";
};
const getVehicleDistanceLabel = (booking: BookingRecord) =>
   booking.vehicleDistanceKm ? `${booking.vehicleDistanceKm} km ride` : "Ride distance pending";

const getBookingKind = (booking: BookingRecord): Exclude<BookingKind, "all"> => (
   getNormalizedBookingType(booking) === "vehicle" ? "vehicle" : "stay"
);

const getBookingKindLabel = (kind: BookingKind) => {
   if (kind === "stay") return "Stay bookings";
   if (kind === "vehicle") return "Vehicle bookings";
   return "All bookings";
};

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState<Section>("overview");
   const [bookingKind, setBookingKind] = useState<BookingKind>("all");
   const [bookingTab, setBookingTab] = useState<BookingTab>("active");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isWritingReview, setIsWritingReview] = useState(false);
   const [selectedBooking, setSelectedBooking] = useState<ReviewDraft | null>(null);
  const [loading, setLoading] = useState(true);
   const [bookings, setBookings] = useState<BookingRecord[]>([]);
   const [userReviews, setUserReviews] = useState<ReviewRecord[]>([]);
   const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  
  const { favorites, toggleFavorite } = useFavorites();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Settings form state (sync with user profile)
  const [firstName, setFirstName] = useState(user?.name.split(" ")[0] || "");
  const [lastName, setLastName] = useState(user?.name.split(" ").slice(1).join(" ") || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, reviewsRes] = await Promise.all([
        api.get("/profile/bookings?page=1&limit=50"),
        api.get("/profile/reviews")
      ]);
      
      setBookings(bookingsRes.data.data.bookings || []);
      // Backend returns paginated { page, limit, total, totalPages, reviews }
      const reviewsData = reviewsRes.data.data;
      setUserReviews(Array.isArray(reviewsData) ? reviewsData : (reviewsData?.reviews ?? []));
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();

  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSaveProfileChanges = async () => {
    try {
      await api.put("/profile", { name: `${firstName} ${lastName}`.trim(), phone });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

   const handlePayRide = async (bookingId: string) => {
      try {
         setPayingBookingId(bookingId);
         await api.post(`/bookings/${bookingId}/pay`);
         toast.success("Payment confirmed and ride completed");
         await fetchData();
      } catch (error: any) {
         const message = error?.response?.data?.message || "Failed to confirm payment";
         toast.error(message);
      } finally {
         setPayingBookingId(null);
      }
   };

  const initials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U";
  const displayName = user?.name ?? "Guest";

   const sidebarLinks: { icon: typeof LayoutDashboard; label: string; section: Section }[] = [
    { icon: LayoutDashboard, label: "Overview", section: "overview" },
    { icon: CalendarCheck, label: "My Bookings", section: "bookings" },
    { icon: Heart, label: "Favorites", section: "saved" },
    { icon: MessageSquare, label: "My Reviews", section: "reviews" },
    { icon: Settings, label: "Settings", section: "settings" },
  ];

   const bookingMetrics = bookings.reduce<BookingMetrics>(
      (acc, booking) => {
         const status = (booking?.status ?? "").toLowerCase();
         const bookingDate = toTimestamp(booking?.checkIn) ?? toTimestamp(booking?.createdAt) ?? 0;

         acc.total += 1;
         acc.spend += Number(booking?.totalAmount ?? 0);

         if (ACTIVE_BOOKING_STATUSES.has(status)) acc.active += 1;
         if (COMPLETED_BOOKING_STATUSES.has(status)) acc.completed += 1;
         if (CANCELLED_BOOKING_STATUSES.has(status)) acc.cancelled += 1;

         if (ACTIVE_BOOKING_STATUSES.has(status) && bookingDate) {
            acc.upcoming.push(booking);
         }

         return acc;
      },
      {
         total: 0,
         active: 0,
         completed: 0,
         cancelled: 0,
         spend: 0,
         upcoming: [],
      },
   );

   const bookingKindCounts = bookings.reduce(
      (acc, booking) => {
         acc[getBookingKind(booking)] += 1;
         return acc;
      },
      { all: bookings.length, stay: 0, vehicle: 0 } as Record<BookingKind, number>,
   );

   const sortedUpcomingBookings = bookingMetrics.upcoming
      .slice()
      .sort((left, right) => (toTimestamp(left?.checkIn) ?? 0) - (toTimestamp(right?.checkIn) ?? 0))
      .slice(0, 2);

   const filteredBookings = bookings.filter((b) => {
         if (bookingKind !== "all" && getBookingKind(b) !== bookingKind) return false;
      const status = (b.status ?? "").toLowerCase();
      if (bookingTab === "active") return ACTIVE_BOOKING_STATUSES.has(status);
      if (bookingTab === "completed") return COMPLETED_BOOKING_STATUSES.has(status);
      return CANCELLED_BOOKING_STATUSES.has(status);
  });

   // Track which bookings already have a review so we hide the "Leave Review" button
   const reviewedBookingIds = new Set(
      userReviews.map((r) => r.bookingId).filter((id): id is string => Boolean(id)),
   );

   const openReviewDialog = (b: BookingRecord) => {
      setSelectedBooking({ ...b, rating: 5, title: "", comment: "" });
      setIsWritingReview(true);
   };

   const BookingCard = ({ b }: { b: BookingRecord }) => {
      const statusMeta = getBookingStatusMeta(b.status);
      const isVehicle = getBookingKind(b) === "vehicle";
      const isPaymentPending = (b.status ?? "").toLowerCase() === "payment_pending";
      const isCompleted = (b.status ?? "").toLowerCase() === "completed";
      const hasReview = reviewedBookingIds.has(b.id);
      const canReview = isCompleted && !hasReview;

      return (
         <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-primary/30 transition-all duration-300">
            <div className="p-5 sm:p-6">
               <div className="flex flex-col md:flex-row gap-6">
                  {/* Thumbnail */}
                  <div className="relative w-full md:w-48 h-32 shrink-0 rounded-xl overflow-hidden bg-slate-50">
                     {isVehicle ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white">
                           <Car className="h-8 w-8 mb-1" />
                           <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">Ride</span>
                        </div>
                     ) : b.stay?.images?.[0] ? (
                        <img src={b.stay.images[0]} className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                           <Compass className="h-10 w-10" />
                        </div>
                     )}
                     <div className="absolute top-2 left-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm border border-white/20 backdrop-blur-md text-white ${statusMeta.dotClassName.replace('bg-', 'bg-')}`}>
                           {statusMeta.label}
                        </span>
                     </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest px-2 py-1 bg-primary/5 rounded-md">
                           {getBookingTypeLabel(b)}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ref: {getBookingReference(b)}</span>
                     </div>

                     <h3 className="text-lg font-black text-slate-900 truncate">
                        {isVehicle ? getVehicleName(b) : getBookingTitle(b)}
                     </h3>
                     
                     <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                           <MapPin className="h-3.5 w-3.5 text-primary/60" />
                           {isVehicle ? getVehicleRoute(b) : getBookingSubtitle(b)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                           <Calendar className="h-3.5 w-3.5 text-primary/60" />
                           {formatBookingDate(b.checkIn)} — {formatBookingDate(b.checkOut)}
                        </div>
                     </div>
                  </div>

                  {/* Pricing & Actions */}
                  <div className="md:w-56 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-6">
                     <div className="text-left md:text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Price</p>
                        <p className="text-2xl font-black text-slate-900">₹{formatCurrency(b.totalAmount)}</p>
                     </div>

                     <div className="mt-4 flex flex-wrap gap-2 md:justify-end">
                        {isVehicle && isPaymentPending && (
                           <Button
                              onClick={(e) => { e.stopPropagation(); handlePayRide(b.id); }}
                              disabled={payingBookingId === b.id}
                              size="sm"
                              className="rounded-lg h-9 px-4 text-[9px] font-black uppercase tracking-widest"
                           >
                              {payingBookingId === b.id ? "..." : "Pay Now"}
                           </Button>
                        )}
                        {canReview && (
                           <Button
                              onClick={(e) => { e.stopPropagation(); openReviewDialog(b); }}
                              size="sm"
                              className="rounded-lg h-9 px-4 text-[9px] font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-white"
                           >
                              <Star className="h-3 w-3 mr-1.5 fill-white" /> Leave Review
                           </Button>
                        )}
                        {hasReview && isCompleted && (
                           <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200">
                              <CheckCircle className="h-3 w-3" /> Reviewed
                           </span>
                        )}
                        <Button asChild variant="ghost" size="sm" className="rounded-lg h-9 px-4 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">
                           <Link to={isVehicle ? `/vehicles/track/${b.id}` : b.id ? `/booking-details/${b.id}` : "/search"}>
                              Details
                           </Link>
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      );
   };

  if (loading && activeSection === "overview") {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-8 h-8 bg-primary rounded-full animate-pulse shadow-xl shadow-primary/20" />
          </div>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">Syncing Lifestyle Data...</p>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_34%),linear-gradient(180deg,_#F8FAFC_0%,_#F4F7FB_100%)]">
      <Navbar />
      
         <div className="flex container mx-auto px-6 py-12 gap-10">
        <aside className="w-72 hidden lg:flex flex-col gap-6">
           <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <div className="flex flex-col items-center text-center">
                 <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center text-2xl font-bold mb-4 border border-slate-200">
                    {initials}
                 </div>
                 <h2 className="text-xl font-bold tracking-tight text-slate-900">{displayName}</h2>
                 <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-2 px-3 py-1 bg-primary/5 rounded-full inline-block">
                    {user?.membershipTier || "Silver"} Member
                 </p>
              </div>
           </div>

           <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex-1">
              <nav className="space-y-1">
                 {sidebarLinks.map((l) => (
                    <button 
                       key={l.label} 
                       onClick={() => setActiveSection(l.section)} 
                       className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeSection === l.section ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                       <l.icon className={`h-4 w-4 ${activeSection === l.section ? "text-white" : "text-slate-400"}`} />
                       {l.label}
                    </button>
                 ))}
              </nav>
              <div className="mt-6 pt-4 border-t border-slate-100 px-2">
                 <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                    <LogOut className="h-4 w-4" /> Sign Out
                 </button>
              </div>
           </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")} 
                     className="text-slate-500 hover:bg-white rounded-2xl px-6 h-12 flex items-center gap-3 group transition-all border border-slate-100 bg-white/70 backdrop-blur-md shadow-sm"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Return Home</span>
            </Button>
          </div>
          {activeSection === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-500">
               {/* Clean Simple Hero */}
               <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                  <div className="relative z-10">
                     <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Hello, {user?.name.split(" ")[0]}!
                     </h1>
                     <p className="text-slate-500 mt-2 font-medium">
                        Welcome to your dashboard. Here's what's happening with your travel plans.
                     </p>
                     <div className="mt-8 flex flex-wrap gap-3">
                        <Button asChild size="sm" className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest">
                           <Link to="/search">Book New Trip</Link>
                        </Button>
                        <Button onClick={() => setActiveSection("bookings")} variant="outline" size="sm" className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest border-slate-200">
                           View History
                        </Button>
                     </div>
                  </div>
               </div>

               {/* Stats Grid - Simple */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                     { label: "Bookings", value: bookingMetrics.total, icon: CalendarCheck, color: "text-blue-600", bg: "bg-blue-50" },
                     { label: "Active", value: bookingMetrics.active, icon: Compass, color: "text-sky-600", bg: "bg-sky-50" },
                     { label: "Completed", value: bookingMetrics.completed, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
                     { label: "Saved", value: favorites.length, icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
                  ].map((metric) => (
                     <div key={metric.label} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className={`w-10 h-10 rounded-xl ${metric.bg} ${metric.color} flex items-center justify-center mb-4`}>
                           <metric.icon className="h-5 w-5" />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{metric.label}</p>
                        <p className="mt-1 text-2xl font-black text-slate-900">{metric.value}</p>
                     </div>
                  ))}
               </div>

               {/* Upcoming Section - Clean */}
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upcoming Trips</h2>
                  </div>
                  
                  <div className="space-y-4">
                     {sortedUpcomingBookings.length > 0 ? (
                        sortedUpcomingBookings.map((booking) => <BookingCard key={booking.id} b={booking} />)
                     ) : (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                           <Compass className="h-8 w-8 text-slate-200 mx-auto mb-4" />
                           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No upcoming trips</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {activeSection === "bookings" && (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Bookings</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your stays and rides</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {([
                        { key: "all", label: "All Bookings", count: bookingKindCounts.all },
                        { key: "stay", label: "Stays", count: bookingKindCounts.stay },
                        { key: "vehicle", label: "Rides", count: bookingKindCounts.vehicle },
                    ] as const).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setBookingKind(tab.key)}
                            className={`p-4 rounded-2xl border text-left transition-all ${bookingKind === tab.key ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:border-slate-300"}`}
                        >
                            <p className={`text-[10px] font-black uppercase tracking-widest ${bookingKind === tab.key ? "text-primary" : "text-slate-400"}`}>{tab.label}</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{tab.count}</p>
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                    {(["active", "completed", "cancelled"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setBookingTab(tab)}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${bookingTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {filteredBookings.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                            <Calendar className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No bookings found</p>
                        </div>
                    ) : (
                        filteredBookings.map(b => <BookingCard key={b.id} b={b} />)
                    )}
                </div>
            </div>
          )}

          {activeSection === "saved" && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Saved Items</h1>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Stays you have favorited</p>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 {favorites.map((p: any) => (
                   <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group hover:border-primary/30 transition-all">
                     <div className="aspect-[16/10] overflow-hidden bg-slate-100 relative">
                        <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <button onClick={() => toggleFavorite(p)} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-rose-500 shadow-sm">
                           <Heart className="h-4 w-4 fill-rose-500" />
                        </button>
                     </div>
                     <div className="p-5">
                       <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded bg-primary/5 text-[9px] font-black text-primary uppercase tracking-widest">{p.type}</span>
                          <div className="flex items-center gap-1 text-amber-400">
                             <Star className="h-3 w-3 fill-current" />
                             <span className="text-xs font-black text-slate-900">{p.rating}</span>
                          </div>
                       </div>
                       <h3 className="text-lg font-black text-slate-900 truncate mb-1">{p.title}</h3>
                       <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-4">
                          <MapPin className="h-3 w-3" /> {p.location}
                       </p>
                       <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price from</p>
                            <p className="text-xl font-black text-slate-900">₹{p.price.toLocaleString()}</p>
                         </div>
                         <Button variant="outline" size="sm" onClick={() => navigate(`/stay-details/${p.id}`)} className="rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-50">View details</Button>
                       </div>
                     </div>
                   </div>
                 ))}
                 {favorites.length === 0 && (
                    <div className="text-center col-span-full py-24 bg-white rounded-2xl border border-dashed border-slate-200">
                       <Heart className="h-10 w-10 text-slate-100 mx-auto mb-4" />
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No favorites yet</p>
                    </div>
                 )}
               </div>
            </div>
          )}

          {activeSection === "reviews" && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Reviews</h1>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Feedback you've provided</p>
               </div>
               <div className="space-y-4">
                 {userReviews.length > 0 ? userReviews.map(r => (
                   <div key={r.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-primary/20 transition-all">
                     <div className="flex justify-between items-start mb-4">
                       <div>
                          <h3 className="text-lg font-black text-slate-900">{r.stay?.name || "Stay Experience"}</h3>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reviewed on {new Date(r.createdAt).toLocaleDateString()}</p>
                       </div>
                       <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}
                       </div>
                     </div>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-sm text-slate-600 font-medium leading-relaxed italic">"{r.comment}"</p>
                     </div>
                   </div>
                 )) : (
                    <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200">
                       <MessageSquare className="h-10 w-10 text-slate-100 mx-auto mb-4" />
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No reviews yet</p>
                    </div>
                 )}
               </div>
            </div>
          )}

          {activeSection === "settings" && (
            <div className="max-w-2xl space-y-8 animate-in fade-in duration-500">
               <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Settings</h1>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your profile information</p>
               </div>
               <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm space-y-8">
                 <div className="space-y-6">
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <UserCheck className="h-4 w-4 text-primary" /> Profile Details
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">First Name</p>
                         <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="h-11 rounded-xl border-slate-200 bg-white font-bold" />
                      </div>
                      <div className="space-y-1.5">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Last Name</p>
                         <Input value={lastName} onChange={e => setLastName(e.target.value)} className="h-11 rounded-xl border-slate-200 bg-white font-bold" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Email Address</p>
                         <Input value={email} disabled className="h-11 rounded-xl border-slate-100 bg-slate-50 text-slate-400" />
                      </div>
                      <div className="space-y-1.5">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Phone Number</p>
                         <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-11 rounded-xl border-slate-200 bg-white font-bold" />
                      </div>
                    </div>
                 </div>
                 <Button onClick={handleSaveProfileChanges} className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest transition-all">Save Profile Changes</Button>
               </div>
            </div>
          )}
        </main>
      </div>

      {/* Write Review Dialog */}
      <Dialog
         open={isWritingReview}
         onOpenChange={(open) => {
            setIsWritingReview(open);
            if (!open) setSelectedBooking(null);
         }}
      >
        <DialogContent className="max-w-md rounded-2xl p-8">
           <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight mb-1">Write a Review</DialogTitle>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Share your experience with the community</p>
           </DialogHeader>
           <div className="space-y-6 py-2">
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Rating</p>
                 <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                       <button 
                          key={s} 
                          onClick={() => setSelectedBooking((current) => (current ? { ...current, rating: s } : current))}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedBooking?.rating >= s ? "bg-primary text-white shadow-md shadow-primary/20 scale-105" : "bg-slate-50 text-slate-300 hover:bg-slate-100"}`}
                       >
                          <Star className={`h-5 w-5 ${selectedBooking?.rating >= s ? "fill-white" : ""}`} />
                       </button>
                    ))}
                 </div>
              </div>
              <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Review Title</p>
                 <Input 
                    placeholder="Brief summary..." 
                    value={selectedBooking?.title || ""}
                    onChange={e => setSelectedBooking((current) => (current ? { ...current, title: e.target.value } : current))}
                    className="h-11 rounded-xl border-slate-200 bg-white font-bold"
                 />
              </div>
              <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Your Experience</p>
                 <textarea 
                    placeholder="Tell us more about your stay or ride..." 
                    className="w-full h-32 p-4 rounded-xl border border-slate-200 bg-white font-medium text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                    value={selectedBooking?.comment || ""}
                    onChange={e => setSelectedBooking((current) => (current ? { ...current, comment: e.target.value } : current))}
                 />
              </div>
           </div>
           <DialogFooter className="mt-6 flex gap-2">
              <Button variant="ghost" onClick={() => { setIsWritingReview(false); setSelectedBooking(null); }} className="h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</Button>
              <Button 
                 onClick={async () => {
                    try {
                       if (!selectedBooking) return;

                       const itemType = String(selectedBooking.type ?? "").toLowerCase() as "stay" | "vehicle" | "attraction";
                       const itemId =
                          itemType === "vehicle" ? selectedBooking.vehicleId :
                          itemType === "attraction" ? selectedBooking.attractionId :
                          selectedBooking.stayId;

                       if (!itemId) {
                          toast.error("Could not determine the booked item to review");
                          return;
                       }

                       const title = (selectedBooking.title || "").trim();
                       const comment = (selectedBooking.comment || "").trim();
                       const rating = selectedBooking.rating || 0;

                       if (rating < 1 || rating > 5) {
                          toast.error("Please select a rating between 1 and 5");
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

                       await api.post("/reviews", {
                          bookingId: selectedBooking.id,
                          itemId,
                          itemType,
                          rating,
                          title,
                          comment,
                       });
                       toast.success("Review submitted!");
                       setIsWritingReview(false);
                       setSelectedBooking(null);
                       fetchData();
                    } catch (error: unknown) {
                       const message = error && typeof error === "object" && "response" in error
                         ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message)
                         : undefined;
                       toast.error(message || "Failed to submit review");
                    }
                 }} 
                 className="h-11 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest"
              >
                 Submit Review
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Dashboard;
