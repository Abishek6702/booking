import { useState, useEffect, useCallback, useMemo } from "react";
import AdminLayout from "../components/AdminLayout";
import { Loader2, CalendarCheck, RefreshCw, Calendar, IndianRupee } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import api from "../lib/api";

const STATUS_BADGE: Record<string, string> = {
  hold: "bg-slate-50 text-slate-500",
  pending: "bg-amber-50 text-amber-600",
  confirmed: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-rose-50 text-rose-600",
  expired: "bg-slate-100 text-slate-400",
  completed: "bg-blue-50 text-blue-600",
};

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

const AdminBookings = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  // Period filter state
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // All bookings for client-side period filtering (loaded separately)
  const [allBookings, setAllBookings] = useState<any[]>([]);

  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(LIMIT),
        ...(statusFilter !== "ALL" ? { status: statusFilter.toLowerCase() } : {}),
      });
      const res = await api.get(`/admin/bookings?${params}`);
      setBookings(res.data.data.bookings ?? []);
      setTotal(res.data.data.total ?? 0);
    } catch { toast.error("Failed to load bookings"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [page, statusFilter]);

  // Fetch all bookings for period revenue calculation (max limit is 100 on backend)
  const fetchAllBookings = useCallback(async () => {
    try {
      const res = await api.get("/admin/bookings?page=1&limit=100");
      setAllBookings(res.data.data.bookings ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { fetchAllBookings(); }, [fetchAllBookings]);

  useEffect(() => {
    const interval = setInterval(() => fetchBookings(true), 30000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  // Compute period-filtered bookings and revenue
  const periodFiltered = useMemo(() => {
    const { start, end } = getPeriodDates(period, customStart, customEnd);
    return allBookings.filter((b: any) => {
      const d = new Date(b.createdAt || b.checkIn);
      return d >= start && d <= end;
    });
  }, [allBookings, period, customStart, customEnd]);

  const periodRevenue = useMemo(() =>
    periodFiltered.reduce((acc: number, b: any) => acc + Number(b.totalPrice || b.totalAmount || 0), 0),
  [periodFiltered]);

  const mainTableFiltered = useMemo(() => {
    return periodFiltered.filter((b: any) => 
      statusFilter === "ALL" || b.status?.toUpperCase() === statusFilter
    );
  }, [periodFiltered, statusFilter]);

  const displayBookings = mainTableFiltered.slice((page - 1) * LIMIT, page * LIMIT);
  const displayTotal = mainTableFiltered.length;

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Bookings</h1>
          <p className="text-sm text-slate-500 mt-1">Platform-wide booking history and status.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => fetchBookings(true)} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Revenue Period Filter ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 mr-2">
            <Calendar className="h-4 w-4 text-violet-500" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Revenue Period</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => { setPeriod(p.value); setShowCustom(p.value === "custom"); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === p.value
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Revenue summary */}
          <div className="ml-auto flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-1.5">
            <IndianRupee className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-xs font-bold text-violet-600">₹{periodRevenue.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 font-medium">· {periodFiltered.length} bookings</span>
          </div>
        </div>
        {showCustom && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <input
              type="date"
              value={customStart}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setCustomStart(e.target.value)}
              className="h-8 border border-slate-200 rounded-lg px-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <span className="text-slate-400 text-xs font-bold">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              min={customStart}
              max={new Date().toISOString().split('T')[0]}
              className="h-8 border border-slate-200 rounded-lg px-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        )}
      </div>



      {/* ── Status Filter Tabs ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "HOLD", "EXPIRED"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading && displayBookings.length === 0 ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
        ) : displayBookings.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <CalendarCheck className="h-10 w-10 mb-3 text-slate-200" /><p className="text-sm">No bookings found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["ID", "Guest", "Type", "Dates", "Amount", "Status"].map(h => (
                      <th key={h} className="text-left p-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayBookings.map((booking: any) => (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4"><span className="font-mono text-xs text-slate-500">#{booking.id.slice(-8).toUpperCase()}</span></td>
                      <td className="p-4">
                        <p className="font-medium text-slate-900 text-sm">{booking.user?.name || "—"}</p>
                        <p className="text-xs text-slate-400">{booking.user?.email || ""}</p>
                      </td>
                      <td className="p-4"><span className="text-xs text-slate-600 capitalize font-medium">{booking.type || "—"}</span></td>
                      <td className="p-4">
                        {booking.checkIn ? (
                          <>
                            <p className="text-xs text-slate-600">{new Date(booking.checkIn).toLocaleDateString()}</p>
                            <p className="text-xs text-slate-400">→ {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : "—"}</p>
                          </>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="p-4"><span className="font-bold text-slate-900">₹{Number(booking.totalPrice || 0).toLocaleString()}</span></td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${STATUS_BADGE[booking.status] || STATUS_BADGE.pending}`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {displayTotal > LIMIT && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, displayTotal)} of {displayTotal}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 text-xs">Previous</Button>
                  <Button size="sm" variant="outline" disabled={page * LIMIT >= displayTotal} onClick={() => setPage(p => p + 1)} className="h-8 text-xs">Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBookings;
