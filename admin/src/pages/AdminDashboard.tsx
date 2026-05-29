import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../components/AdminLayout";
import { Users, Building2, Car, CalendarCheck, ShieldAlert, Loader2, TrendingUp, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../lib/api";

interface Stats {
  totalUsers: number;
  totalStays: number;
  pendingStays: number;
  totalVehicles: number;
  pendingVehicles: number;
  totalBookings: number;
  pendingOwners: number;
  pendingDrivers: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalStays: 0, pendingStays: 0,
    totalVehicles: 0, pendingVehicles: 0, totalBookings: 0, pendingOwners: 0,
    pendingDrivers: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [pendingOwners, setPendingOwners] = useState<any[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // Single stats call replaces 6 separate count requests
      const [statsRes, bookingsRes, ownersRes, driversRes] = await Promise.allSettled([
        api.get("/admin/stats"),
        api.get("/admin/bookings?limit=5"),
        api.get("/admin/owners/pending?limit=5"),
        api.get("/admin/drivers/pending?limit=5"),
      ]);

      if (statsRes.status === "fulfilled") {
        const s = statsRes.value.data.data;
        setStats({
          totalUsers:      s.totalUsers      ?? 0,
          totalStays:      s.listings?.stays ?? 0,
          pendingStays:    s.listings?.pendingStays ?? 0,
          totalVehicles:   s.listings?.vehicles ?? 0,
          pendingVehicles: s.listings?.pendingVehicles ?? 0,
          totalBookings:   s.totalBookings   ?? 0,
          pendingOwners:   s.pendingOwners   ?? 0,
          pendingDrivers:  s.pendingDrivers  ?? 0,
        });
      }
      setRecentBookings(bookingsRes.status === "fulfilled" ? (bookingsRes.value.data.data.bookings ?? []) : []);
      setPendingOwners(ownersRes.status === "fulfilled" ? (ownersRes.value.data.data.owners ?? []) : []);
      setPendingDrivers(driversRes.status === "fulfilled" ? (driversRes.value.data.data.drivers ?? []) : []);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApproveOwner = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/approve-owner`);
      toast.success("Owner approved");
      setPendingOwners(prev => prev.filter(o => o.id !== id));
      setStats(prev => ({ ...prev, pendingOwners: Math.max(0, prev.pendingOwners - 1) }));
    } catch { toast.error("Failed to approve owner"); }
  };

  const handleRejectOwner = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/reject-owner`);
      toast.success("Owner rejected");
      setPendingOwners(prev => prev.filter(o => o.id !== id));
      setStats(prev => ({ ...prev, pendingOwners: Math.max(0, prev.pendingOwners - 1) }));
    } catch { toast.error("Failed to reject owner"); }
  };

  const handleApproveDriver = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/approve-driver`);
      toast.success("Driver approved");
      setPendingDrivers(prev => prev.filter(d => d.id !== id));
      setStats(prev => ({ ...prev, pendingDrivers: Math.max(0, prev.pendingDrivers - 1) }));
    } catch { toast.error("Failed to approve driver"); }
  };

  const handleRejectDriver = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/reject-driver`);
      toast.success("Driver rejected");
      setPendingDrivers(prev => prev.filter(d => d.id !== id));
      setStats(prev => ({ ...prev, pendingDrivers: Math.max(0, prev.pendingDrivers - 1) }));
    } catch { toast.error("Failed to reject driver"); }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { icon: Users, label: "Total Users", value: stats.totalUsers, color: "text-blue-600 bg-blue-50", path: "/users" },
    { icon: Building2, label: "Properties", value: stats.totalStays, badge: stats.pendingStays > 0 ? `${stats.pendingStays} pending` : null, color: "text-emerald-600 bg-emerald-50", path: "/stays" },
    { icon: Car, label: "Vehicles", value: stats.totalVehicles, badge: stats.pendingVehicles > 0 ? `${stats.pendingVehicles} pending` : null, color: "text-violet-600 bg-violet-50", path: "/vehicles" },
    { icon: ShieldAlert, label: "Pending Owners", value: stats.pendingOwners, color: "text-rose-600 bg-rose-50", path: "/users?role=owner" },
    { icon: Car, label: "Pending Drivers", value: stats.pendingDrivers, color: "text-amber-600 bg-amber-50", path: "/users?role=driver" },
    { icon: CalendarCheck, label: "Total Bookings", value: stats.totalBookings, color: "text-orange-600 bg-orange-50", path: "/bookings" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor all platform activity and pending approvals.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => fetchData(true)} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center gap-5 shadow-sm transition-all text-left w-full"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              {card.badge && <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">{card.badge}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Pending Approvals (Owners & Drivers)</h2>
            <Button variant="ghost" size="sm" className="text-violet-500 text-xs" onClick={() => navigate("/users")}>View all →</Button>
          </div>
          <div className="divide-y divide-slate-50">
            {pendingOwners.length === 0 && pendingDrivers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <CheckCircle className="h-8 w-8 mx-auto mb-3 text-emerald-300" />
                No pending approvals
              </div>
            ) : (
              <>
                {pendingOwners.map((owner: any) => (
                  <div key={owner.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{owner.name} <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full ml-2 tracking-widest">Owner</span></p>
                      <p className="text-xs text-slate-400">{owner.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs" onClick={() => handleApproveOwner(owner.id)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs" onClick={() => handleRejectOwner(owner.id)}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingDrivers.map((driver: any) => (
                  <div key={driver.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{driver.name} <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full ml-2 tracking-widest">Driver</span></p>
                      <p className="text-xs text-slate-400">{driver.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs" onClick={() => handleApproveDriver(driver.id)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs" onClick={() => handleRejectDriver(driver.id)}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Recent Bookings</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {recentBookings.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <Clock className="h-8 w-8 mx-auto mb-3 text-slate-200" />
                No recent bookings
              </div>
            ) : recentBookings.map((booking: any) => (
              <div key={booking.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-slate-900">#{booking.id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-slate-400">{booking.user?.name || "Guest"}{booking.type ? ` · ${booking.type}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">₹{Number(booking.totalPrice || 0).toLocaleString()}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    booking.status === "confirmed" ? "bg-emerald-50 text-emerald-600" :
                    booking.status === "completed" ? "bg-blue-50 text-blue-600" :
                    booking.status === "cancelled" ? "bg-rose-50 text-rose-600" :
                    "bg-amber-50 text-amber-600"
                  }`}>{booking.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
