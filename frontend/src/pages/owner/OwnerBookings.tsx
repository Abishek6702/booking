/* eslint-disable @typescript-eslint/no-explicit-any */
import OwnerLayout from "@/components/OwnerLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, CheckCircle, XCircle, Clock, Loader2, MapPin, Navigation, Car, PhoneCall, PlayCircle, Flag, Calendar, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import api from "@/lib/api";

type Period = "today" | "week" | "month" | "year" | "custom";

const PERIODS: { label: string; value: Period }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
  { label: "Custom", value: "custom" },
];

const getPeriodDates = (period: Period, customStart?: string, customEnd?: string): { start: Date; end: Date } => {
  const now = new Date();
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  if (period === "today") { const start = new Date(now); start.setHours(0,0,0,0); return { start, end }; }
  if (period === "week") { const start = new Date(now); start.setDate(now.getDate()-6); start.setHours(0,0,0,0); return { start, end }; }
  if (period === "month") { return { start: new Date(now.getFullYear(), now.getMonth(), 1), end }; }
  if (period === "year") { return { start: new Date(now.getFullYear(), 0, 1), end }; }
  if (period === "custom" && customStart && customEnd) {
    const s = new Date(customStart); s.setHours(0,0,0,0);
    const e = new Date(customEnd); e.setHours(23,59,59,999);
    return { start: s, end: e };
  }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
};

const PAGE_SIZE = 10;

const statusColor = (s: string) => {
  if (s === "confirmed") return "bg-emerald-50 text-emerald-600 border border-emerald-100";
  if (s === "pending") return "bg-amber-50 text-amber-600 border border-amber-100";
  if (s === "arrived") return "bg-blue-50 text-blue-600 border border-blue-100";
  if (s === "in_progress") return "bg-purple-50 text-purple-600 border border-purple-100";
  if (s === "completed") return "bg-slate-100 text-slate-600 border border-slate-200";
  if (s === "cancelled" || s === "expired") return "bg-red-50 text-red-500 border border-red-100";
  return "bg-slate-100 text-slate-500 border border-slate-200";
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: "Awaiting Accept",
    confirmed: "Driver En Route",
    arrived: "Driver Arrived",
    in_progress: "Trip In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
    hold: "Hold",
  };
  return map[s?.toLowerCase()] || s;
};

// ─── Ride Request Banner ──────────────────────────────────────────────────────

const RideRequestBanner = ({ booking, onAccept, onDecline, loading }: {
  booking: any;
  onAccept: () => void;
  onDecline: () => void;
  loading: boolean;
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-20 right-6 z-50 w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-right-8 duration-500">
      <div className="bg-gradient-to-r from-primary to-primary/80 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">New Booking Request</p>
            <h3 className="text-lg font-black text-white mt-0.5">Trip Request!</h3>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
            <Car className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pickup</p>
              <p className="text-sm font-bold text-slate-700">{booking.pickupAddress || "Customer Location"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Navigation className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Drop-off</p>
              <p className="text-sm font-bold text-slate-700">{booking.dropoffAddress || "Destination"}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onDecline}
            disabled={loading}
            className="flex-1 h-12 rounded-2xl border border-red-200 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            disabled={loading}
            className="flex-2 h-12 px-6 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Accept Booking <CheckCircle className="h-4 w-4" /></>}
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-400 font-medium">{elapsed}s elapsed</p>
      </div>
    </div>
  );
};

// ─── Active Ride Controls ─────────────────────────────────────────────────────

const ActiveRidePanel = ({ booking, onAction, loading }: {
  booking: any;
  onAction: (action: "arrived" | "start" | "complete", otp?: string) => void;
  loading: boolean;
}) => {
  const [otp, setOtp] = useState("");

  const status = booking.status?.toLowerCase();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[480px] bg-slate-900 rounded-[2rem] shadow-2xl border border-white/10 p-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Active Ride</p>
          <p className="text-base font-black text-white">{booking.user?.name || "Customer"}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusColor(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      <div className="space-y-2 mb-5 text-sm">
        <div className="flex items-center gap-2 text-white/60">
          <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <span className="text-xs">{booking.pickupAddress || "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <Navigation className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs">{booking.dropoffAddress || "—"}</span>
        </div>
      </div>

      {status === "confirmed" && (
        <button
          onClick={() => onAction("arrived")}
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-blue-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PhoneCall className="h-4 w-4" /> I've Arrived</>}
        </button>
      )}

      {status === "arrived" && (
        <div className="space-y-3">
          <div>
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5">Enter Customer OTP</p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/, "").slice(0, 4))}
              placeholder="4-digit OTP"
              className="w-full h-12 bg-white/10 border border-white/20 rounded-2xl px-4 text-white font-black text-center text-lg tracking-[0.4em] outline-none placeholder:text-white/20"
              maxLength={4}
            />
          </div>
          <button
            onClick={() => onAction("start", otp)}
            disabled={loading || otp.length !== 4}
            className="w-full h-12 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:grayscale"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PlayCircle className="h-4 w-4" /> Start Trip</>}
          </button>
        </div>
      )}

      {status === "in_progress" && (
        <button
          onClick={() => onAction("complete")}
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/25"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Flag className="h-4 w-4" /> Complete Trip</>}
        </button>
      )}
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

const OwnerBookings = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const prevPendingIds = useRef<Set<string>>(new Set());

  // Period revenue filter
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const fetchBookings = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get("/bookings/owner?page=1&limit=100");
      const data = res.data.data?.bookings || [];
      
      // Check for new pending ride requests
      const pendingVehicle = data.filter((b: any) => 
        b.type === "vehicle" && b.status?.toLowerCase() === "pending"
      );
      pendingVehicle.forEach((b: any) => {
        if (!prevPendingIds.current.has(b.id)) {
          toast.info("📋 New booking request received! Review and accept.", { duration: 6000 });
        }
      });
      prevPendingIds.current = new Set(pendingVehicle.map((b: any) => b.id));
      
      setBookings(data);
    } catch (error: any) {
      console.error("Failed to load bookings:", error?.response?.data || error);
      if (!silent) toast.error("Failed to load bookings");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // Poll every 3 seconds for new ride requests
    const interval = setInterval(() => fetchBookings(true), 3000);
    return () => clearInterval(interval);
  }, []);

  const pendingRideRequest = bookings.find(
    (b) => b.type === "vehicle" && b.status?.toLowerCase() === "pending"
  );

  const activeRide = bookings.find(
    (b) => b.type === "vehicle" && 
    ["confirmed", "arrived", "in_progress"].includes(b.status?.toLowerCase())
  );

  // Date-period filtered bookings for revenue panel
  const periodFiltered = useMemo(() => {
    const { start, end } = getPeriodDates(period, customStart, customEnd);
    return bookings.filter((b: any) => {
      const d = new Date(b.createdAt || b.checkIn);
      return d >= start && d <= end;
    });
  }, [bookings, period, customStart, customEnd]);

  const periodRevenue = useMemo(() =>
    periodFiltered.reduce((acc: number, b: any) => acc + Number(b.totalAmount || 0), 0),
  [periodFiltered]);

  const filtered = useMemo(() => {
    return periodFiltered.filter(b => {
      const guestName = b.guest?.name || "";
      const matchSearch =
        search === "" ||
        guestName.toLowerCase().includes(search.toLowerCase()) ||
        b.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" || b.status?.toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [periodFiltered, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRideAction = async (bookingId: string, action: "accept" | "decline" | "arrived" | "start" | "complete", otp?: string) => {
    try {
      setActionLoading(true);
      if (action === "start") {
        await api.post(`/bookings/${bookingId}/start`, { otp });
        toast.success("Trip started! Safe driving.");
      } else {
        await api.post(`/bookings/${bookingId}/${action}`, {});
        const msgs = {
          accept: "Ride accepted! Head to pickup.",
          decline: "Ride declined.",
          arrived: "Marked as arrived. Ask customer for OTP.",
          complete: "Trip completed! Great job.",
        };
        toast.success(msgs[action as keyof typeof msgs]);
      }
      fetchBookings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/bookings/${id}/approve`);
      toast.success("Booking approved!");
      fetchBookings();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve booking");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.post(`/bookings/${id}/cancel`, {});
      toast.success("Booking cancelled.");
      fetchBookings();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to cancel booking");
    }
  };

  const handleExportCSV = () => {
    const data = filtered.map(b => ({
      ID: b.id,
      Guest: b.guest?.name || "Guest",
      Type: b.type || "—",
      Pickup: b.pickupAddress || b.stay?.title || b.room?.name || "—",
      "Drop-off": b.dropoffAddress || "—",
      Amount: b.totalAmount || 0,
      Status: b.status || ""
    }));
    import("@/utils/exportUtils").then(utils => {
      utils.exportToCSV(data, "bookings");
      toast.success("CSV exported successfully!");
    });
  };

  return (
    <OwnerLayout>
      {/* New Ride Request Banner */}
      {pendingRideRequest && (
        <RideRequestBanner
          booking={pendingRideRequest}
          loading={actionLoading}
          onAccept={() => handleRideAction(pendingRideRequest.id, "accept")}
          onDecline={() => handleRideAction(pendingRideRequest.id, "decline")}
        />
      )}

      {/* Active Ride Controls */}
      {activeRide && !pendingRideRequest && (
        <ActiveRidePanel
          booking={activeRide}
          loading={actionLoading}
          onAction={(action, otp) => handleRideAction(activeRide.id, action as any, otp)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Booking Management</h1>
          <p className="text-sm text-slate-500 mt-1">Review and manage all reservations and ride requests.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchBookings()}>
            <Clock className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Revenue Period Filter ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 mr-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Revenue Period</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => { setPeriod(p.value); setShowCustom(p.value === "custom"); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === p.value
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {/* Revenue summary pill */}
        <div className="ml-auto flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl px-3 py-1.5">
          <IndianRupee className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-primary">₹{periodRevenue.toLocaleString()}</span>
          <span className="text-[10px] text-slate-400 font-medium">· {periodFiltered.length} bookings</span>
        </div>
        {showCustom && (
          <div className="flex items-center gap-2 w-full flex-wrap mt-1">
            <input
              type="date"
              value={customStart}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setCustomStart(e.target.value)}
              className="h-8 border border-slate-200 rounded-lg px-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-slate-400 text-xs font-bold">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              min={customStart}
              max={new Date().toISOString().split('T')[0]}
              className="h-8 border border-slate-200 rounded-lg px-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
      </div>



      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search guest name, booking ID..."
              className="pl-10 h-10 border-slate-200 focus-visible:ring-primary/20"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-44 h-10 border-slate-200">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="All Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending (Ride Requests)</SelectItem>
                <SelectItem value="confirmed">Confirmed (En Route)</SelectItem>
                <SelectItem value="arrived">Arrived</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Booking Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="font-medium">No bookings found</p>
                      <p className="text-xs mt-1">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : paginated.map((b) => (
                  <tr key={b.id} className={`hover:bg-slate-50/50 transition-colors ${b.type === "vehicle" && b.status?.toLowerCase() === "pending" ? "bg-amber-50/50" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">#{b.id.slice(-8)}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                          {b.type === "vehicle" ? "🚗 Ride" : "🏠 Stay"} · {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{b.guest?.name || "Guest"}</span>
                        <span className="text-xs text-slate-400">{b.guest?.email || ""}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        {b.type === "vehicle" ? (
                          <>
                            <span className="text-slate-700 text-xs font-medium">{b.pickupAddress || "—"}</span>
                            <span className="text-xs text-slate-400">→ {b.dropoffAddress || "—"}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-700">{b.stay?.title || b.room?.name || "Property"}</span>
                            <span className="text-xs text-slate-400">
                              {b.checkIn ? new Date(b.checkIn).toLocaleDateString() : ""} – {b.checkOut ? new Date(b.checkOut).toLocaleDateString() : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">₹{(b.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(b.status?.toLowerCase())}`}>
                        {statusLabel(b.status?.toLowerCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {b.status?.toLowerCase() === "pending" && b.type !== "vehicle" && (
                              <DropdownMenuItem onClick={() => handleApprove(b.id)}>
                                <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> Approve
                              </DropdownMenuItem>
                            )}
                            {b.status?.toLowerCase() === "pending" && b.type === "vehicle" && (
                              <>
                                <DropdownMenuItem onClick={() => handleRideAction(b.id, "accept")}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> Accept Ride
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleRideAction(b.id, "decline")}>
                                  <XCircle className="h-4 w-4 mr-2" /> Decline Ride
                                </DropdownMenuItem>
                              </>
                            )}
                            {b.status?.toLowerCase() === "confirmed" && b.type === "vehicle" && (
                              <DropdownMenuItem onClick={() => handleRideAction(b.id, "arrived")}>
                                <MapPin className="h-4 w-4 mr-2 text-blue-500" /> Mark Arrived
                              </DropdownMenuItem>
                            )}
                            {b.status?.toLowerCase() === "in_progress" && (
                              <DropdownMenuItem onClick={() => handleRideAction(b.id, "complete")}>
                                <Flag className="h-4 w-4 mr-2 text-primary" /> Complete Trip
                              </DropdownMenuItem>
                            )}
                            {!["cancelled", "completed", "expired"].includes(b.status?.toLowerCase()) && (
                              <DropdownMenuItem className="text-destructive" onClick={() => handleCancel(b.id)}>
                                <XCircle className="h-4 w-4 mr-2" /> Cancel Booking
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toast.info(`Booking ID: ${b.id}`)}>
                              <Clock className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <p>Showing {filtered.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} bookings</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-2 font-bold text-slate-700">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-8" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
};

export default OwnerBookings;
