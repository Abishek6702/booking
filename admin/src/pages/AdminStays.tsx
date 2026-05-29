import { useState, useEffect } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  Loader2, Search, Building2, CheckCircle, XCircle, MapPin,
  FileText, ShieldCheck, ShieldX, User, Mail, Phone, Clock,
  ExternalLink, Eye, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import api from "../lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-600 border-amber-100",
  approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
  rejected: "bg-rose-50 text-rose-600 border-rose-100",
  PENDING:  "bg-amber-50 text-amber-600 border-amber-100",
  APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-100",
  REJECTED: "bg-rose-50 text-rose-600 border-rose-100",
};

const DOC_LABELS: Record<string, string> = {
  businessLicense:        "Business License",
  tourismRegistration:    "Tourism Registration",
  gstCertificate:        "GST Certificate",
  propertyOwnershipProof: "Property Ownership Proof",
  governmentId:          "Government ID Proof",
  aadhaarCard:           "Aadhaar Card",
  panCard:               "PAN Card",
};

// ── Owner KYC row ─────────────────────────────────────────────────────────────
const OwnerKycRow = ({
  owner,
  onApprove,
  onReject,
}: {
  owner: any;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const docs: string[] = owner.documents ?? [];

  // Try to parse doc name from URL or index
  const getDocLabel = (url: string, idx: number): string => {
    try {
      const name = decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? "");
      // Try to match a known key from the filename
      for (const [key, label] of Object.entries(DOC_LABELS)) {
        if (name.toLowerCase().includes(key.toLowerCase())) return label;
      }
      return `Document ${idx + 1}`;
    } catch {
      return `Document ${idx + 1}`;
    }
  };

  const isImage = (url: string) =>
    /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between p-5 gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 font-black text-lg flex-shrink-0">
            {owner.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-900">{owner.name}</p>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[owner.ownerStatus] ?? STATUS_BADGE.PENDING}`}>
                {owner.ownerStatus}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Mail className="h-3 w-3" /> {owner.email}
              </span>
              {owner.phone && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {owner.phone}
                </span>
              )}
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {new Date(owner.createdAt).toLocaleDateString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Document count badge + expand toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            {docs.length} doc{docs.length !== 1 ? "s" : ""}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {owner.ownerStatus === "PENDING" && !rejectMode && (
            <>
              <Button
                size="sm"
                className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs gap-1"
                onClick={() => onApprove(owner.id)}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 gap-1"
                onClick={() => setRejectMode(true)}
              >
                <ShieldX className="h-3.5 w-3.5" /> Reject
              </Button>
            </>
          )}
          {owner.ownerStatus !== "PENDING" && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-lg ${
              owner.ownerStatus === "APPROVED"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600"
            }`}>
              {owner.ownerStatus === "APPROVED" ? "Approved ✓" : "Rejected ✗"}
            </span>
          )}
        </div>
      </div>

      {/* Reject reason input */}
      {rejectMode && (
        <div className="px-5 pb-4 flex gap-2">
          <Input
            placeholder="Reason for rejection (optional)..."
            className="h-9 text-xs flex-1"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
          <Button
            size="sm"
            className="h-9 bg-rose-500 hover:bg-rose-600 text-white text-xs"
            onClick={() => { onReject(owner.id); setRejectMode(false); setRejectReason(""); }}
          >
            Confirm Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 text-xs"
            onClick={() => { setRejectMode(false); setRejectReason(""); }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Documents panel */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-5">
          {docs.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
              <AlertCircle className="h-4 w-4" />
              No documents uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {docs.map((url, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm group hover:border-violet-300 transition-colors">
                  {/* Preview */}
                  <div className="h-28 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                    {isImage(url) ? (
                      <img src={url} alt={getDocLabel(url, idx)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FileText className="h-10 w-10" />
                        <span className="text-[10px] font-medium uppercase tracking-wide">PDF Document</span>
                      </div>
                    )}
                    {/* Open overlay */}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold"
                    >
                      <ExternalLink className="h-4 w-4" /> View Full
                    </a>
                  </div>

                  {/* Label + actions */}
                  <div className="p-3">
                    <p className="text-xs font-semibold text-slate-700 truncate">{getDocLabel(url, idx)}</p>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-violet-600 hover:underline mt-1"
                    >
                      <Eye className="h-3 w-3" /> Open in new tab
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main AdminStays ───────────────────────────────────────────────────────────
const AdminStays = () => {
  const [activeTab, setActiveTab] = useState<"kyc" | "stays">("kyc");

  // ── KYC state ────────────────────────────────────────────────────────────────
  const [kycLoading, setKycLoading]   = useState(true);
  const [owners, setOwners]           = useState<any[]>([]);
  const [kycFilter, setKycFilter]     = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [kycPage, setKycPage]         = useState(1);
  const [kycTotal, setKycTotal]       = useState(0);
  const KYC_LIMIT = 10;

  // ── Stays state ───────────────────────────────────────────────────────────────
  const [stayLoading, setStayLoading] = useState(true);
  const [stays, setStays]             = useState<any[]>([]);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stayPage, setStayPage]       = useState(1);
  const [stayTotal, setStayTotal]     = useState(0);
  const [rejectId, setRejectId]       = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const STAY_LIMIT = 15;

  // ── Fetch pending owners ──────────────────────────────────────────────────────
  const fetchOwners = async () => {
    try {
      setKycLoading(true);
      // Use /admin/owners/pending for PENDING, or /admin/users?role=owner for all
      if (kycFilter === "PENDING") {
        const res = await api.get(`/admin/owners/pending?page=${kycPage}&limit=${KYC_LIMIT}`);
        setOwners(res.data.data.owners ?? []);
        setKycTotal(res.data.data.total ?? 0);
      } else {
        const status = kycFilter === "ALL" ? "" : `&ownerStatus=${kycFilter.toLowerCase()}`;
        const res = await api.get(`/admin/users?role=owner&page=${kycPage}&limit=${KYC_LIMIT}${status}`);
        const all = res.data.data.users ?? [];
        const filtered = kycFilter === "ALL"
          ? all
          : all.filter((u: any) => u.ownerStatus?.toUpperCase() === kycFilter);
        setOwners(filtered);
        setKycTotal(res.data.data.total ?? 0);
      }
    } catch { toast.error("Failed to load owner verifications"); }
    finally { setKycLoading(false); }
  };

  // ── Fetch stays ───────────────────────────────────────────────────────────────
  const fetchStays = async () => {
    try {
      setStayLoading(true);
      const params = new URLSearchParams({
        page: String(stayPage), limit: String(STAY_LIMIT),
        ...(statusFilter !== "ALL" ? { status: statusFilter.toLowerCase() } : {}),
        ...(search ? { search } : {}),
      });
      const res = await api.get(`/admin/stays?${params}`);
      setStays(res.data.data.stays ?? []);
      setStayTotal(res.data.data.total ?? 0);
    } catch { toast.error("Failed to load stays"); }
    finally { setStayLoading(false); }
  };

  useEffect(() => { if (activeTab === "kyc") fetchOwners(); }, [kycPage, kycFilter, activeTab]);
  useEffect(() => { if (activeTab === "stays") fetchStays(); }, [stayPage, statusFilter, activeTab]);

  // ── KYC actions ───────────────────────────────────────────────────────────────
  const handleApproveOwner = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/approve-owner`);
      toast.success("Owner approved — they can now access the dashboard.");
      setOwners(prev => prev.map(o => o.id === id ? { ...o, ownerStatus: "APPROVED" } : o));
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to approve owner");
    }
  };

  const handleRejectOwner = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/reject-owner`);
      toast.success("Owner rejected.");
      setOwners(prev => prev.map(o => o.id === id ? { ...o, ownerStatus: "REJECTED" } : o));
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to reject owner");
    }
  };

  // ── Stay actions ──────────────────────────────────────────────────────────────
  const handleApproveStay = async (id: string) => {
    try {
      await api.patch(`/admin/stays/${id}/approve`);
      toast.success("Stay approved");
      setStays(prev => prev.map(s => s.id === id ? { ...s, moderationStatus: "APPROVED" } : s));
    } catch { toast.error("Failed to approve stay"); }
  };

  const handleRejectStay = async (id: string) => {
    if (!rejectReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    try {
      await api.patch(`/admin/stays/${id}/reject`, { reason: rejectReason });
      toast.success("Stay rejected");
      setStays(prev => prev.map(s => s.id === id ? { ...s, moderationStatus: "REJECTED", moderationReason: rejectReason } : s));
      setRejectId(null); setRejectReason("");
    } catch { toast.error("Failed to reject stay"); }
  };

  const pendingCount = owners.filter(o => o.ownerStatus === "PENDING").length;

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Property &amp; Owner Moderation</h1>
        <p className="text-sm text-slate-500 mt-1">Verify owner documents and moderate property listings.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("kyc")}
          className={`relative pb-3 px-4 text-sm font-semibold transition-colors ${
            activeTab === "kyc"
              ? "text-violet-600 border-b-2 border-violet-500"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Owner KYC Verification
          {pendingCount > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("stays")}
          className={`pb-3 px-4 text-sm font-semibold transition-colors ${
            activeTab === "stays"
              ? "text-violet-600 border-b-2 border-violet-500"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Property Listings
        </button>
      </div>

      {/* ── KYC TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === "kyc" && (
        <div>
          {/* Filter bar */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map(f => (
              <button
                key={f}
                onClick={() => { setKycFilter(f); setKycPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  kycFilter === f
                    ? f === "PENDING" ? "bg-amber-500 text-white"
                    : f === "APPROVED" ? "bg-emerald-500 text-white"
                    : f === "REJECTED" ? "bg-rose-500 text-white"
                    : "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {kycLoading ? (
            <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-slate-100">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : owners.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-100 gap-3">
              <ShieldCheck className="h-12 w-12 text-slate-200" />
              <div className="text-center">
                <p className="text-sm font-semibold">No owners to review</p>
                <p className="text-xs text-slate-400 mt-1">
                  {kycFilter === "PENDING" ? "All pending applications have been reviewed." : `No ${kycFilter.toLowerCase()} owners found.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {owners.map(owner => (
                <OwnerKycRow
                  key={owner.id}
                  owner={owner}
                  onApprove={handleApproveOwner}
                  onReject={handleRejectOwner}
                />
              ))}
              {kycTotal > KYC_LIMIT && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-500">
                    Showing {(kycPage - 1) * KYC_LIMIT + 1}–{Math.min(kycPage * KYC_LIMIT, kycTotal)} of {kycTotal}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={kycPage === 1} onClick={() => setKycPage(p => p - 1)} className="h-8 text-xs">Previous</Button>
                    <Button size="sm" variant="outline" disabled={kycPage * KYC_LIMIT >= kycTotal} onClick={() => setKycPage(p => p + 1)} className="h-8 text-xs">Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STAYS TAB ───────────────────────────────────────────────────────── */}
      {activeTab === "stays" && (
        <div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
            <form onSubmit={e => { e.preventDefault(); setStayPage(1); fetchStays(); }} className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Search by title or city..." className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button type="submit" size="sm" className="h-9 bg-violet-500 hover:bg-violet-600 text-white">Search</Button>
            </form>
            <div className="flex gap-2 flex-wrap">
              {["ALL", "PENDING", "APPROVED", "REJECTED"].map(s => (
                <button key={s} onClick={() => { setStatusFilter(s); setStayPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {stayLoading ? (
            <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-slate-100">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : stays.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-100">
              <Building2 className="h-10 w-10 mb-3 text-slate-200" /><p className="text-sm">No properties found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stays.map((stay: any) => (
                <div key={stay.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {stay.images?.[0] ? (
                      <div className="w-full md:w-48 h-36 bg-slate-100 flex-shrink-0 overflow-hidden">
                        <img src={stay.images[0]} alt={stay.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full md:w-48 h-36 bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[stay.moderationStatus?.toLowerCase()] || STATUS_BADGE.pending}`}>
                              {stay.moderationStatus}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-medium">{stay.type}</span>
                          </div>
                          <h3 className="font-bold text-slate-900">{stay.title}</h3>
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-3.5 w-3.5" /> {stay.city}, {stay.country}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <User className="h-3 w-3" /> {stay.owner?.name || stay.ownerId}
                          </p>
                          {stay.moderationReason && <p className="text-xs text-violet-500 mt-1">Reason: {stay.moderationReason}</p>}
                        </div>
                        <p className="text-xs text-slate-400 flex-shrink-0">{new Date(stay.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                        {stay.moderationStatus?.toLowerCase() !== "approved" && (
                          <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs" onClick={() => handleApproveStay(stay.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                        )}
                        {stay.moderationStatus?.toLowerCase() !== "rejected" && (
                          rejectId === stay.id ? (
                            <div className="flex gap-2 flex-1">
                              <Input placeholder="Rejection reason..." className="h-8 text-xs flex-1" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                              <Button size="sm" className="h-8 bg-violet-500 hover:bg-violet-600 text-white text-xs" onClick={() => handleRejectStay(stay.id)}>Confirm</Button>
                              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setRejectId(stay.id)}>
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {stayTotal > STAY_LIMIT && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-500">Showing {(stayPage - 1) * STAY_LIMIT + 1}–{Math.min(stayPage * STAY_LIMIT, stayTotal)} of {stayTotal}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={stayPage === 1} onClick={() => setStayPage(p => p - 1)} className="h-8 text-xs">Previous</Button>
                    <Button size="sm" variant="outline" disabled={stayPage * STAY_LIMIT >= stayTotal} onClick={() => setStayPage(p => p + 1)} className="h-8 text-xs">Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminStays;
