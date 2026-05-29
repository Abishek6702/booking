import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Clock, MapPin, Phone, MessageCircle, X, Star, Shield, ChevronUp, Navigation, ArrowLeft } from "lucide-react";
import BookingRequestSent from "@/components/BookingRequestSent";

type RidePhase = "idle" | "searching" | "accepted" | "arriving" | "arrived" | "in_progress" | "completion_pending_confirmation" | "completed" | "rejected" | "cancelled";

const DRIVERS = [
  { name: "Rajesh Kumar",  rating: 4.9, trips: 3240, phone: "+91 98765 43210", avatar: "RK", color: "bg-orange-500" },
  { name: "Suresh Babu",   rating: 4.8, trips: 2891, phone: "+91 87654 32109", avatar: "SB", color: "bg-blue-600"   },
  { name: "Arjun Nair",    rating: 4.7, trips: 1540, phone: "+91 76543 21098", avatar: "AN", color: "bg-emerald-600"},
];
const PLATES = ["KA 05 AB 1234", "TN 09 CD 5678", "MH 12 EF 9012"];

// Simulated driver path as percentage positions across the map div
const PATH: { x: number; y: number }[] = [
  { x: 15, y: 20 }, { x: 22, y: 28 }, { x: 30, y: 35 },
  { x: 40, y: 38 }, { x: 50, y: 42 }, { x: 58, y: 48 },
  { x: 65, y: 52 }, { x: 70, y: 58 }, { x: 75, y: 60 },
];

interface Props {
  phase: RidePhase;
  onCancel: () => void;
  vehicleName: string;
  driverData?: { name: string; phone?: string; rating?: number; trips?: number };
  otp?: string | null;
  onConfirm?: () => void;
  isCancelling?: boolean;
}

export default function RideTracker({ phase, onCancel, vehicleName, driverData, otp, onConfirm, isCancelling }: Props) {
  const [driver] = useState(() => {
    if (driverData && driverData.name) {
      return {
        name: driverData.name,
        phone: driverData.phone || "+91 99999 88888",
        rating: driverData.rating ?? 4.8,
        trips: driverData.trips ?? 1200,
        avatar: driverData.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
        color: "bg-primary",
      };
    }

    // No driver data from backend — show a neutral placeholder rather than random names
    return {
      name: "Verified Professional",
      phone: "+91 99999 88888",
      rating: "—" as string | number,
      trips: 0,
      avatar: "VP",
      color: "bg-slate-600",
    };
  });
  const [plate]  = useState(() => PLATES[Math.floor(Math.random() * PLATES.length)]);
  const [eta, setEta] = useState(8);
  const [pathIdx, setPathIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const etaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pathRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "arriving") {
      etaRef.current = setInterval(() => {
        setEta(p => {
          if (p <= 1) { clearInterval(etaRef.current!); return 0; }
          return p - 1;
        });
      }, 8000);
      pathRef.current = setInterval(() => {
        setPathIdx(p => {
          if (p >= PATH.length - 1) { clearInterval(pathRef.current!); return p; }
          return p + 1;
        });
      }, 3500);
    }
    return () => {
      clearInterval(etaRef.current!);
      clearInterval(pathRef.current!);
    };
  }, [phase]);

  const dot = PATH[pathIdx];

  // ── Idle / just-booked ────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-slate-900 rounded-none lg:rounded-[2rem] p-12 text-center relative overflow-y-auto scrollbar-hide">
        <button 
          onClick={onCancel}
          className="absolute top-8 left-8 z-50 h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="h-24 w-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Navigation className="h-10 w-10 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-2">Live Tracking</p>
          <h3 className="text-2xl font-black text-white">Book a ride to activate</h3>
          <p className="text-slate-400 text-sm mt-2 font-medium">Once you book, you'll see your driver's live location here in real-time.</p>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs mt-4">
          {["Driver ETA", "Live Map", "Safe Ride"].map((f, i) => (
            <div key={f} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2">
              {i === 0 && <Clock className="h-5 w-5 text-blue-400" />}
              {i === 1 && <MapPin className="h-5 w-5 text-primary" />}
              {i === 2 && <Shield className="h-5 w-5 text-emerald-400" />}
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">{f}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Driver Rejected ────────────────────────────────────────────────────────
  if (phase === "rejected") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-slate-900 rounded-none lg:rounded-[2rem] p-12 text-center relative overflow-y-auto scrollbar-hide">
        <div className="h-24 w-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
          <X className="h-12 w-12 text-red-400" />
        </div>
        <div>
          <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.4em] mb-2">Request Declined</p>
          <h3 className="text-2xl font-black text-white leading-tight">Driver Unavailable</h3>
          <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed max-w-xs">
            The driver has declined your ride request for <span className="text-white font-bold">{vehicleName}</span>. Please try booking another driver.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="w-full max-w-xs py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all"
        >
          Browse Other Drivers
        </button>
      </div>
    );
  }

  // ── Cancelled (by customer, driver, or expired) ───────────────────────────
  if (phase === "cancelled") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-slate-900 rounded-none lg:rounded-[2rem] p-12 text-center relative overflow-y-auto scrollbar-hide">
        <div className="h-24 w-24 rounded-full bg-slate-500/10 border-2 border-slate-500/30 flex items-center justify-center">
          <X className="h-12 w-12 text-slate-400" />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Ride Cancelled</p>
          <h3 className="text-2xl font-black text-white leading-tight">This ride was cancelled</h3>
          <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed max-w-xs">
            The ride request for <span className="text-white font-bold">{vehicleName}</span> has been cancelled.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="w-full max-w-xs py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all"
        >
          Browse Drivers
        </button>
      </div>
    );
  }

  // ── Awaiting Customer Confirmation ────────────────────────────────────────
  if (phase === "completion_pending_confirmation" || phase === "completed") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-slate-900 rounded-none lg:rounded-[2rem] p-12 text-center relative overflow-y-auto scrollbar-hide">
        <div className="h-24 w-24 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-amber-400" />
        </div>
        <div>
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.4em] mb-2">Trip Complete</p>
          <h3 className="text-2xl font-black text-white leading-tight">Confirm Your Trip</h3>
          <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed max-w-xs">
            Your driver has marked the trip as complete. Please confirm to proceed to payment.
          </p>
        </div>
        <button
          onClick={onConfirm}
          className="w-full max-w-xs py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm uppercase tracking-widest hover:bg-emerald-600 transition-all"
        >
          Confirm & Pay
        </button>
      </div>
    );
  }

  // ── Booking Requested (Pending) ─────────────────────────────────────────
  if (phase === "searching") {
    return (
      <BookingRequestSent
        destinationName={vehicleName || "Dhhdh Hehe"}
        onCancel={onCancel}
        isCancelling={isCancelling}
      />
    );
  }

  // ── Accepted / Arriving / Arrived ─────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-none lg:rounded-[2rem] overflow-y-auto scrollbar-hide relative">
      
      {/* ── Back Button ────────────────────────────────────────────────── */}
      <button 
        onClick={onCancel}
        className="absolute top-8 left-8 z-50 h-10 w-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl group"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
      </button>

      {/* ── Map area ────────────────────────────────────────────────────── */}
      <div className="min-h-[400px] flex-1 relative overflow-hidden">
        {/* OSM tile background */}
        <iframe
          src="https://www.openstreetmap.org/export/embed.html?bbox=80.1,12.9,80.3,13.1&layer=mapnik"
          className="w-full h-full border-0 opacity-60 grayscale"
          title="Live Map"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-transparent to-slate-900/80" />

        {/* ── Animated driver dot ─────────────────────────────────────── */}
        <div
          className="absolute z-20 transition-all duration-&lsqb;3500ms&rsqb; ease-in-out"
          style={{ left: `${dot.x}%`, top: `${dot.y}%`, transform: "translate(-50%,-50%)" }}
        >
          <div className="relative">
            <div className="absolute inset-0 h-10 w-10 rounded-full bg-primary/40 animate-ping" />
            <div className="relative h-10 w-10 rounded-full bg-primary border-2 border-white shadow-xl flex items-center justify-center text-lg z-10">
              🏍️
            </div>
          </div>
        </div>

        {/* ── Pickup pin ──────────────────────────────────────────────── */}
        <div className="absolute bottom-[25%] right-[30%] z-20">
          <div className="flex flex-col items-center">
            <div className="bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest mb-1 shadow-lg">YOU</div>
            <div className="h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-lg" />
          </div>
        </div>

        {/* ── Top status bar ──────────────────────────────────────────── */}
        {phase === "arrived" ? (
          <div className="absolute top-4 left-4 right-4 bg-emerald-500 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl z-30">
            <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0" />
            <div>
              <p className="text-white text-xs font-black uppercase tracking-widest">Driver Arrived!</p>
              <p className="text-emerald-100 text-[10px] font-semibold">Look for {vehicleName} · {plate}</p>
            </div>
          </div>
        ) : (
          <div className="absolute top-4 left-4 right-4 bg-white/10 backdrop-blur-2xl rounded-2xl px-5 py-3 flex items-center justify-between shadow-xl border border-white/10 z-30">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Driver ETA</p>
                <p className="text-white font-black text-sm">{eta === 0 ? "Arriving now" : `${eta} min${eta !== 1 ? "s" : ""} away`}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Status</p>
                <p className="text-emerald-400 font-black text-sm uppercase">
                  {phase === "accepted" ? "Confirmed" : phase === "in_progress" ? "Riding" : eta === 0 ? "Here!" : "En Route"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── ETA progress bar ────────────────────────────────────────── */}
        {phase === "arriving" && eta > 0 && (
          <div className="absolute bottom-[calc(100%-2px)] left-0 right-0 h-1 bg-white/10 z-30">
            <div
              className="h-full bg-primary transition-all duration-&lsqb;8000ms&rsqb; ease-linear rounded-full"
              style={{ width: `${100 - (eta / 8) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Driver card (bottom sheet) ───────────────────────────────────── */}
      <div className={`relative z-30 bg-slate-900 border-t border-white/10 transition-all duration-500 ${expanded ? "pb-8" : "pb-4"}`}>

        {/* drag handle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex justify-center pt-3 pb-1"
        >
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
            <ChevronUp className={`h-3 w-3 text-white/30 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
          </div>
        </button>

        <div className="px-6 pt-2">
          {/* Driver row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className={`h-14 w-14 rounded-2xl ${driver.color} flex items-center justify-center shadow-xl flex-shrink-0`}>
                <span className="text-white font-black text-lg">{driver.avatar}</span>
              </div>
              <div>
                <p className="text-white font-black text-base leading-tight">{driver.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-amber-400 text-xs font-black">{driver.rating}</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">·</span>
                  <span className="text-slate-400 text-[10px] font-bold">{driver.trips.toLocaleString()} trips</span>
                </div>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex gap-3">
              <a
                href={`tel:${driver.phone}`}
                className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
              >
                <Phone className="h-4 w-4" />
              </a>
              <button className="h-11 w-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-all">
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Vehicle + OTP pill */}
          <div className="mt-4 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
            <span className="text-2xl">🏍️</span>
            <div className="flex-1">
              <p className="text-white font-black text-sm">{vehicleName}</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">{plate}</p>
            </div>
            {phase === "in_progress" ? (
              <div className="text-right flex flex-col items-end gap-1">
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-2.5 py-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">OTP Verified</p>
                </div>
              </div>
            ) : otp && (phase === "accepted" || phase === "arriving" || phase === "arrived") ? (
              <div className="text-right">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Your OTP</p>
                <p className="text-primary font-black text-xl tracking-[0.4em]">{otp}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Share with driver</p>
              </div>
            ) : null}
          </div>

          {/* Expanded: safety info */}
          {expanded && (
            <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: "🛡️", label: "SOS Button", desc: "Emergency help" },
                  { icon: "📍", label: "Share Trip", desc: "Send to family" },
                  { icon: "⭐", label: "Rate Driver", desc: "After ride ends" },
                ].map(f => (
                  <div key={f.label} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                    <span className="text-xl">{f.icon}</span>
                    <p className="text-white text-[10px] font-black uppercase tracking-widest mt-1">{f.label}</p>
                    <p className="text-slate-500 text-[9px] mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4" />
                {isCancelling ? "Cancelling..." : "Cancel Ride"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
