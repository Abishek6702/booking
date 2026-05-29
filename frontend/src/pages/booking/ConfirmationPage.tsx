/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLocation, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, MapPin, Download, Share2, Loader2, Home, CreditCard, ChevronRight, User } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useBooking } from "@/context/BookingContext";

const formatGuests = (guests: unknown): string => {
  if (!guests) return "2 Guests";
  if (typeof guests === "string") return guests;
  if (typeof guests === "object" && guests !== null) {
    const g = guests as Record<string, number>;
    const parts: string[] = [];
    if (g.adults) parts.push(`${g.adults} Adult${g.adults > 1 ? "s" : ""}`);
    if (g.children) parts.push(`${g.children} Child${g.children > 1 ? "ren" : ""}`);
    return parts.length > 0 ? parts.join(", ") : "2 Guests";
  }
  return String(guests);
};

const ConfirmationPage = () => {
  const location = useLocation();
  const { bookingId: contextBookingId } = useBooking();
  const [booking, setBooking] = useState<any>(location.state);
  const [loading, setLoading] = useState(!location.state);

  useEffect(() => {
    const fetchBooking = async () => {
      const bId = booking?.bookingId || contextBookingId;
      if (!bId) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/bookings/${bId}`);
        setBooking(response.data.data);
      } catch (error) {
        console.error("Failed to fetch booking details");
      } finally {
        setLoading(false);
      }
    };

    if (!booking) fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextBookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20 mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Finalizing Your Stay...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <main className="container mx-auto px-4 py-24 max-w-lg text-center relative z-10">
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 p-10 shadow-2xl">
            <div className="w-24 h-24 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-rose-100">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Invalid Session</h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10">We couldn't find your active booking session. If you just completed a payment, your booking was successful and you can view it in your dashboard.</p>
            <Link to="/dashboard">
              <Button className="w-full bg-slate-900 h-14 rounded-2xl font-black text-xs uppercase tracking-widest">Go to My Bookings</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const propertyName = booking?.propertyName || booking?.stay?.title || "Luxury Stay";
  const propertyLocation = booking?.propertyLocation || booking?.stay?.city || "WAYNEXX Destination";
  const roomName = booking?.roomName || booking?.room?.name || "Premium Accomodation";
  const checkIn = booking?.checkIn || "—";
  const checkOut = booking?.checkOut || "—";
  const guestsDisplay = formatGuests(booking?.guests);
  const total = booking?.total || booking?.totalAmount || 0;
  const displayId = booking?.bookingId || contextBookingId || booking?.id || "N/A";

  const formatPrice = (val: number) => `₹${new Intl.NumberFormat("en-IN").format(Math.round(val))}`;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-primary/5 blur-[100px] rounded-full" />
      </div>

      <main className="container mx-auto px-4 py-12 md:py-20 max-w-2xl relative z-10">
        <div className="text-center mb-12 animate-in fade-in zoom-in duration-700">
          <div className="w-24 h-24 bg-emerald-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/10 border-4 border-white animate-bounce-subtle">
            <CheckCircle className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">Booking Confirmed!</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm">Pack your bags, you're going to {propertyLocation.split(',')[0]}!</p>
        </div>

        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Confirmation Details</p>
                  <h2 className="text-2xl font-black text-slate-900">{propertyName}</h2>
                  <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {propertyLocation}</p>
                </div>
                <div className="bg-slate-900 text-white rounded-2xl px-4 py-2 text-center">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Booking ID</p>
                  <p className="text-xs font-black">#{String(displayId).slice(-8).toUpperCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50/80 rounded-[2rem] border border-slate-100 mb-8">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Check-in
                  </p>
                  <p className="text-sm font-black text-slate-700">
                    {checkIn !== "—" ? new Date(checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : "—"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Check-out
                  </p>
                  <p className="text-sm font-black text-slate-700">
                    {checkOut !== "—" ? new Date(checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : "—"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Guests
                  </p>
                  <p className="text-sm font-black text-slate-700">{guestsDisplay}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Home className="h-3 w-3" /> Room Type
                  </p>
                  <p className="text-sm font-black text-slate-700 truncate">{roomName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-6 border-y border-slate-100 mb-8">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${booking?.status === "PAID" || booking?.paid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{booking?.status === "PAID" || booking?.paid ? "Total Price Paid" : "Total Payable Amount"}</p>
                    <p className="text-2xl font-black text-slate-900 leading-none">{formatPrice(total)}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${booking?.status === "PAID" || booking?.paid ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-amber-600 bg-amber-50 border-amber-100"}`}>
                   {booking?.status === "PAID" || booking?.paid ? "Payment Success" : "Awaiting Payment"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 h-14 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]">
                  <Download className="h-4 w-4" /> Download Receipt
                </button>
                <button className="flex items-center justify-center gap-2 h-14 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]">
                  <Share2 className="h-4 w-4" /> Share It
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link to="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full h-14 rounded-2xl border-slate-200 bg-white text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-50">
                Go to My Bookings
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button className="w-full h-14 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 group">
                Find Next Trip <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </div>
          
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-8">
            A confirmation email has been sent to {booking?.guest?.email || "your registered email"}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ConfirmationPage;

