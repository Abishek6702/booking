import { useState, useEffect } from "react";
import AdminLayout from "../components/AdminLayout";
import { Loader2, Search, Car, CheckCircle, XCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import api from "../lib/api";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-100",
  approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
  rejected: "bg-rose-50 text-rose-600 border-rose-100",
};

const AdminVehicles = () => {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const LIMIT = 15;

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page), limit: String(LIMIT),
        ...(statusFilter !== "ALL" ? { status: statusFilter.toLowerCase() } : {}),
        ...(search ? { search } : {}),
      });
      const res = await api.get(`/admin/vehicles?${params}`);
      setVehicles(res.data.data.vehicles ?? []);
      setTotal(res.data.data.total ?? 0);
    } catch { toast.error("Failed to load vehicles"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVehicles(); }, [page, statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/admin/vehicles/${id}/approve`);
      toast.success("Vehicle approved");
      setVehicles(prev => prev.map(v => v.id === id ? { ...v, moderationStatus: "APPROVED" } : v));
    } catch { toast.error("Failed to approve vehicle"); }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    try {
      await api.patch(`/admin/vehicles/${id}/reject`, { reason: rejectReason });
      toast.success("Vehicle rejected");
      setVehicles(prev => prev.map(v => v.id === id ? { ...v, moderationStatus: "REJECTED", moderationReason: rejectReason } : v));
      setRejectId(null); setRejectReason("");
    } catch { toast.error("Failed to reject vehicle"); }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Vehicle Moderation</h1>
        <p className="text-sm text-slate-500 mt-1">Review and approve vehicle listings.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <form onSubmit={e => { e.preventDefault(); setPage(1); fetchVehicles(); }} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by brand or model..." className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button type="submit" size="sm" className="h-9 bg-violet-500 hover:bg-violet-600 text-white">Search</Button>
        </form>
        <div className="flex gap-2">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
        ) : vehicles.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <Car className="h-10 w-10 mb-3 text-slate-200" /><p className="text-sm">No vehicles found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["Vehicle", "Type", "Driver", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left p-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {vehicles.map((vehicle: any) => (
                    <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {vehicle.images?.[0]
                            ? <img src={vehicle.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            : <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Car className="h-5 w-5 text-slate-400" /></div>}
                          <div>
                            <p className="font-semibold text-slate-900">{vehicle.brand} {vehicle.model}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{vehicle.description || "No reg number"}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{vehicle.seats} seats · ₹{Number(vehicle.pricePerKm || 0).toFixed(0)}/km</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><span className="text-xs text-slate-600 font-medium capitalize">{vehicle.type}</span></td>
                      <td className="p-4">
                        <p className="text-xs font-medium text-slate-700">{vehicle.driver?.name || "—"}</p>
                        <p className="text-xs text-slate-400">{vehicle.driver?.email || ""}</p>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[vehicle.moderationStatus?.toLowerCase()] || STATUS_BADGE.pending}`}>
                          {vehicle.moderationStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {vehicle.moderationStatus?.toLowerCase() !== "approved" && (
                            <Button size="sm" className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white text-xs" onClick={() => handleApprove(vehicle.id)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Approve
                            </Button>
                          )}
                          {vehicle.moderationStatus?.toLowerCase() !== "rejected" && (
                            rejectId === vehicle.id ? (
                              <div className="flex gap-2">
                                <Input placeholder="Reason..." className="h-7 text-xs w-32" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                                <Button size="sm" className="h-7 bg-violet-500 hover:bg-violet-600 text-white text-xs" onClick={() => handleReject(vehicle.id)}>OK</Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setRejectId(null); setRejectReason(""); }}>✕</Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setRejectId(vehicle.id)}>
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > LIMIT && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 text-xs">Previous</Button>
                  <Button size="sm" variant="outline" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="h-8 text-xs">Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminVehicles;
