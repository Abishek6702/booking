/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import OwnerLayout from "@/components/OwnerLayout";
import { IndianRupee, CalendarCheck, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, MoreVertical, Eye, CheckCircle, XCircle, Download, Calendar, ChevronDown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";

type Period = "today" | "week" | "month" | "year" | "custom";

const getPeriodDates = (period: Period, customStart?: string, customEnd?: string): { start: Date; end: Date } => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "today") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (period === "week") {
    const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end };
  }
  if (period === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { start, end };
  }
  if (period === "custom" && customStart && customEnd) {
    const start = new Date(customStart); start.setHours(0, 0, 0, 0);
    const endD = new Date(customEnd); endD.setHours(23, 59, 59, 999);
    return { start, end: endD };
  }
  // default: month
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
};

const PERIODS: { label: string; value: Period }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
  { label: "Custom", value: "custom" },
];

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);

  // Period filter state
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const [dashRes, analyticsRes, bookingsRes] = await Promise.all([
          api.get("/owner/dashboard"),
          api.get("/owner/analytics?range=30days"),
          api.get("/bookings/owner?page=1&limit=100"),
        ]);

        setDashboardData(dashRes.data.data);

        const analyticsData = analyticsRes.data.data;
        const revenueMap = new Map((analyticsData.revenueOverTime || []).map((r: any) => [r.date, r.revenue]));
        const merged = (analyticsData.bookingsOverTime || []).map((b: any) => ({
          name: b.date,
          bookings: b.count,
          revenue: revenueMap.get(b.date) || 0,
        }));
        setAnalytics(merged.length > 0 ? merged : []);
        setAllBookings(bookingsRes.data.data?.bookings || []);
      } catch (error) {
        console.error("Dashboard fetch failed:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Compute filtered stats based on selected period
  const filteredStats = useMemo(() => {
    const { start, end } = getPeriodDates(period, customStart, customEnd);
    const filtered = allBookings.filter((b: any) => {
      const d = new Date(b.createdAt || b.checkIn);
      return d >= start && d <= end;
    });
    const revenue = filtered.reduce((acc: number, b: any) => acc + Number(b.totalAmount || 0), 0);
    const active = filtered.filter((b: any) => ["confirmed", "pending"].includes(b.status?.toLowerCase())).length;
    return { revenue, count: filtered.length, active, bookings: filtered };
  }, [allBookings, period, customStart, customEnd]);

  // Filter analytics chart data by period
  const filteredAnalytics = useMemo(() => {
    const { start, end } = getPeriodDates(period, customStart, customEnd);
    return analytics.filter((d: any) => {
      const dt = new Date(d.name);
      return dt >= start && dt <= end;
    });
  }, [analytics, period, customStart, customEnd]);

  const handleBookingAction = async (id: string, action: "approve" | "cancel") => {
    try {
      if (action === "approve") {
        await api.post(`/bookings/${id}/approve`);
      } else {
        await api.post(`/bookings/${id}/cancel`, { reason: "Cancelled by owner from dashboard" });
      }
      toast.success(`Booking ${action}ed successfully`);
      const dashRes = await api.get("/owner/dashboard");
      setDashboardData(dashRes.data.data);
    } catch {
      toast.error("Failed to update booking status");
    }
  };

  const handleExportCSV = () => {
    const data = (dashboardData?.recentBookings || []).map((b: any) => ({
      "Booking ID": b.id, "Guest": b.guest.name, "Room/Villa": b.roomName,
      "Check-in": new Date(b.checkIn).toLocaleDateString(), "Status": b.status, "Amount": b.totalAmount
    }));
    import("@/utils/exportUtils").then(utils => {
      utils.exportToCSV(data, "dashboard_report");
      toast.success("Dashboard report exported as CSV");
    });
  };

  const handleExportPDF = () => {
    const headers = ["Booking ID", "Guest", "Room/Villa", "Check-in", "Status", "Amount"];
    const data = (dashboardData?.recentBookings || []).map((b: any) => [
      `#${b.id.slice(-8)}`, b.guest.name, b.roomName,
      new Date(b.checkIn).toLocaleDateString(), b.status, `INR ${b.totalAmount}`
    ]);
    import("@/utils/exportUtils").then(utils => {
      utils.exportToPDF(headers, data, "dashboard_report", "Owner Dashboard Overview");
      toast.success("Dashboard report exported as PDF");
    });
  };

  if (loading) {
    return (
      <OwnerLayout>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  const stats = dashboardData || {};
  const recentBookings = dashboardData?.recentBookings || [];

  const periodLabel = PERIODS.find(p => p.value === period)?.label || "This Month";

  const statCards = [
    {
      icon: IndianRupee,
      label: "Revenue",
      sublabel: periodLabel,
      value: `₹${filteredStats.revenue.toLocaleString()}`,
      sub: `${filteredStats.count} bookings`,
      trendingUp: true,
    },
    {
      icon: CalendarCheck,
      label: "Active Bookings",
      sublabel: periodLabel,
      value: filteredStats.active,
      sub: "confirmed + pending",
      trendingUp: true,
    },
    {
      icon: Users,
      label: "Total Properties",
      sublabel: "All time",
      value: stats.totalProperties ?? 0,
      sub: "",
      trendingUp: true,
    },
    {
      icon: TrendingUp,
      label: "Occupancy Rate",
      sublabel: "All time",
      value: `${Math.round((stats.occupancyRate || 0) * 100)}%`,
      sub: "",
      trendingUp: true,
    },
  ];

  return (
    <OwnerLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor your property performance and bookings.</p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => navigate("/owner/properties")}>Manage Properties</Button>
        </div>
      </div>

      {/* ── Revenue Period Filter ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 mr-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Revenue Period</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => {
                setPeriod(p.value);
                setShowCustom(p.value === "custom");
              }}
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
        {showCustom && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
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



      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                s.trendingUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}>
                {s.trendingUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {s.sublabel}
              </div>
            </div>
            <h3 className="text-sm font-medium text-slate-500">{s.label}</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
            {s.sub && <p className="text-xs text-slate-400 mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-slate-900">Revenue Analytics</h2>
              <p className="text-xs text-slate-400 mt-0.5">{periodLabel}</p>
            </div>
          </div>
          <div className="h-[300px] w-full min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredAnalytics}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-bold text-slate-900 mb-6">Booking Flow</h2>
          <div className="h-[300px] w-full min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredAnalytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip />
                <Bar dataKey="bookings" radius={[4, 4, 0, 0]}>
                  {filteredAnalytics.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === filteredAnalytics.length - 1 ? '#3b82f6' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Recent Bookings</h2>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/owner/bookings")}>View All</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Booking ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Guest</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Room/Villa</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Check-in</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Amount</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStats.bookings.slice(0, 15).map((b: any) => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">#{b.id.slice(-8)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                        {(b.guest?.name || "G")[0]}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{b.guest?.name || "Guest"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{b.stay?.title || b.roomName || "Property"}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{b.checkIn ? new Date(b.checkIn).toLocaleDateString() : "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      b.status === "confirmed" ? "bg-success/10 text-success" :
                      b.status === "pending" ? "bg-accent/10 text-accent" :
                      "bg-destructive/10 text-destructive"
                    }`}>{b.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">₹{b.totalAmount || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-slate-400 hover:text-slate-600 p-1"><MoreVertical className="h-4 w-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate("/owner/bookings")}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        {b.status === "pending" && (
                          <>
                            <DropdownMenuItem onClick={() => handleBookingAction(b.id, "approve")}>
                              <CheckCircle className="h-4 w-4 mr-2 text-success" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleBookingAction(b.id, "cancel")}>
                              <XCircle className="h-4 w-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filteredStats.bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">No bookings in this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </OwnerLayout>
  );
};

export default OwnerDashboard;
