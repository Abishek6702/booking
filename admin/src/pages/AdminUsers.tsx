import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Loader2, Search, Users, CheckCircle, UserX, ShieldCheck, Eye, XCircle, Mail, Phone, Calendar, CreditCard, Building2, Car, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ROLE_BADGE: Record<string, string> = {
  CUSTOMER: "bg-blue-50 text-blue-600",
  OWNER: "bg-emerald-50 text-emerald-600",
  DRIVER: "bg-amber-50 text-amber-600",
  ADMIN: "bg-rose-50 text-rose-600",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-100",
  APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-100",
  REJECTED: "bg-rose-50 text-rose-600 border-rose-100",
};

const AdminUsers = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const LIMIT = 20;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page), limit: String(LIMIT),
        ...(search ? { search } : {}),
        ...(roleFilter !== "ALL" ? { role: roleFilter.toLowerCase() } : {}),
      });
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data.data.users ?? []);
      setTotal(res.data.data.total ?? 0);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchUsers(); };

  const handleApproveOwner = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/approve-owner`);
      toast.success("Owner approved");
      fetchUsers();
    } catch { toast.error("Failed to approve owner"); }
  };

  const handleRejectOwner = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/reject-owner`);
      toast.success("Owner rejected");
      fetchUsers();
    } catch { toast.error("Failed to reject owner"); }
  };

  const handleApproveDriver = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/approve-driver`);
      toast.success("Driver approved");
      fetchUsers();
    } catch { toast.error("Failed to approve driver"); }
  };

  const handleRejectDriver = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/reject-driver`);
      toast.success("Driver rejected");
      fetchUsers();
    } catch { toast.error("Failed to reject driver"); }
  };

  const confirmDelete = (user: any) => {
    setDeleteTarget(user);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api.delete(`/admin/users/${deleteTarget.id}`);
      toast.success("User deleted successfully");
      setDeleteTarget(null);
      if (isDetailsOpen) setIsDetailsOpen(false);
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const viewDetails = async (user: any) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
    try {
      const res = await api.get(`/admin/users/${user.id}`);
      setSelectedUser(res.data.data);
    } catch {
      toast.error("Failed to load detailed user information");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500 mt-1">{total} total users</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by name, email or ID..." className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button type="submit" size="sm" className="h-9 bg-violet-500 hover:bg-violet-600 text-white">Search</Button>
        </form>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {["ALL", "CUSTOMER", "OWNER", "DRIVER", "ADMIN"].map(role => (
            <button key={role} onClick={() => { setRoleFilter(role); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${roleFilter === role ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
        ) : users.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <Users className="h-10 w-10 mb-3 text-slate-200" /><p className="text-sm">No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left p-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Unique ID</th>
                    <th className="text-left p-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">User</th>
                    <th className="text-left p-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Role</th>
                    <th className="text-left p-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left p-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Joined</th>
                    {roleFilter !== "ADMIN" && (
                      <th className="text-left p-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">#{user.id.slice(-8).toUpperCase()}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${ROLE_BADGE[user.role] || "bg-slate-50 text-slate-500"}`}>{user.role}</span>
                      </td>
                      <td className="p-4">
                        {user.role === "OWNER" ? (
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[user.ownerStatus] || STATUS_BADGE.PENDING}`}>
                            Owner: {user.ownerStatus}
                          </span>
                        ) : user.role === "DRIVER" ? (
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[user.driverStatus] || STATUS_BADGE.PENDING}`}>
                            Driver: {user.driverStatus}
                          </span>
                        ) : user.isVerified ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold"><CheckCircle className="h-3.5 w-3.5" /> Verified</span>
                        ) : (
                          <span className="text-xs text-slate-400">Unverified</span>
                        )}
                      </td>
                      <td className="p-4"><span className="text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</span></td>
                      {roleFilter !== "ADMIN" && (
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600" onClick={() => viewDetails(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600" onClick={() => confirmDelete(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            
                            {user.role === "OWNER" && user.ownerStatus === "PENDING" && (
                              <>
                                <Button size="sm" className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleApproveOwner(user.id)}>
                                  <CheckCircle className="h-3 w-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleRejectOwner(user.id)}>
                                  <XCircle className="h-3 w-3 mr-1" /> Reject
                                </Button>
                              </>
                            )}

                            {user.role === "DRIVER" && user.driverStatus === "PENDING" && (
                              <>
                                <Button size="sm" className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleApproveDriver(user.id)}>
                                  <CheckCircle className="h-3 w-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleRejectDriver(user.id)}>
                                  <XCircle className="h-3 w-3 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          {selectedUser && (
            <div className="bg-white">
              <div className="h-32 bg-slate-900 relative">
                <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-3xl shadow-xl">
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl font-black text-slate-600">
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div className="pt-16 px-8 pb-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{selectedUser.name}</h2>
                    <p className="text-xs font-mono text-slate-400 mt-0.5 uppercase tracking-widest">#{selectedUser.id}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-xl ${ROLE_BADGE[selectedUser.role]}`}>{selectedUser.role}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Mail className="h-3 w-3" /> Email Address
                    </p>
                    <p className="text-xs font-bold text-slate-900 truncate">{selectedUser.email}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Phone className="h-3 w-3" /> Contact
                    </p>
                    <p className="text-xs font-bold text-slate-900">{selectedUser.phone || "Not provided"}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> Joined Date
                    </p>
                    <p className="text-xs font-bold text-slate-900">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <CreditCard className="h-3 w-3" /> Lifetime Spend
                    </p>
                    <p className="text-xs font-bold text-slate-900">₹{Number(selectedUser.lifetimeSpend || 0).toLocaleString()}</p>
                  </div>
                </div>

                {selectedUser.bookings && selectedUser.bookings.length > 0 && selectedUser.bookings[0].guestDetails && (
                  <div className="mt-6 bg-violet-50/50 p-4 rounded-2xl border border-violet-100">
                    <h3 className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em] mb-3">Latest Booking KYC Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                          ID Proof {selectedUser.bookings[0].guestDetails.idProof?.type ? `(${selectedUser.bookings[0].guestDetails.idProof.type})` : ""}
                        </p>
                        <p className="text-xs font-bold text-slate-900 uppercase">
                          {selectedUser.bookings[0].guestDetails.idProof?.number || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Address</p>
                        <p className="text-xs font-bold text-slate-900">
                          {[
                            selectedUser.bookings[0].guestDetails.address?.line1,
                            selectedUser.bookings[0].guestDetails.address?.line2,
                            selectedUser.bookings[0].guestDetails.address?.city,
                            selectedUser.bookings[0].guestDetails.address?.state,
                            selectedUser.bookings[0].guestDetails.address?.pincode
                          ].filter(Boolean).join(", ") || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 space-y-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Inventory & Documents</h3>
                  
                  {selectedUser.role === "OWNER" && (
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Building2 className="h-5 w-5" /></div>
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Owned Stays</p>
                      </div>
                      <span className="text-lg font-black text-slate-900">{selectedUser._count?.ownedStays || 0}</span>
                    </div>
                  )}

                  {selectedUser.role === "DRIVER" && (
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-amber-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Car className="h-5 w-5" /></div>
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Registered Vehicles</p>
                      </div>
                      <span className="text-lg font-black text-slate-900">{selectedUser._count?.vehicles || 0}</span>
                    </div>
                  )}

                  {selectedUser.documents && selectedUser.documents.length > 0 && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Verification Documents</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.documents.map((doc: string, idx: number) => (
                          <a key={idx} href={doc} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:border-violet-500 hover:text-violet-600 transition-all flex items-center gap-2">
                            <ShieldCheck className="h-3 w-3" /> Doc {idx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-10 pt-6 border-t border-slate-50 flex gap-3">
                   <Button variant="outline" className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest border-slate-200" onClick={() => setIsDetailsOpen(false)}>Close Registry</Button>
                   <Button variant="destructive" className="h-12 w-12 rounded-xl" onClick={() => confirmDelete(selectedUser)}>
                     <Trash2 className="h-5 w-5" />
                   </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">Delete User</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-500 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-700">{deleteTarget?.name}</span>?
              This will permanently remove their account and all associated data (stays, bookings, vehicles).
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl text-sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-10 rounded-xl text-sm"
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;
