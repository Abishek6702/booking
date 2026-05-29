import { useState, useEffect, useRef } from "react";
import AdminLayout from "../components/AdminLayout";
import { Loader2, Search, MapPin, Upload, Plus, Download, FileSpreadsheet, Trash2, Edit, Ticket, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "../components/ui/dialog";
import { toast } from "sonner";
import api from "../lib/api";
import * as XLSX from "xlsx";

const EMPTY_FORM = {
  title: "",
  description: "",
  type: "Landmark",
  price: "",
  city: "",
  country: "",
  address: "",
  lat: "",
  lng: "",
  images: "",
};

const AdminAttractions = () => {
  const [loading, setLoading] = useState(true);
  const [attractions, setAttractions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const LIMIT = 10;

  // ── Add Form State ────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // ── Edit Modal State ──────────────────────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ ...EMPTY_FORM });

  const fetchAttractions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search ? { q: search } : {}),
      });
      const res = await api.get(`/attractions?${params}`);
      const payload = res.data?.data;
      if (payload) {
        setAttractions(payload.attractions ?? []);
        setTotal(payload.total ?? 0);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast.error("Failed to load attractions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttractions();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAttractions();
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        price: Number(formData.price),
        images: formData.images.split(",").map(i => i.trim()).filter(i => i),
        location: {
          city: formData.city,
          country: formData.country,
          address: formData.address,
          lat: Number(formData.lat) || 0,
          lng: Number(formData.lng) || 0,
        }
      };

      await api.post("/admin/attractions", payload);
      toast.success("Attraction created successfully");
      setIsAddModalOpen(false);
      setFormData({ ...EMPTY_FORM });
      fetchAttractions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create attraction");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit helpers ──────────────────────────────────────────────────────────
  const handleEditOpen = (item: any) => {
    setEditingAttraction(item);
    setEditFormData({
      title: item.title || "",
      description: item.description || "",
      type: item.type || "Landmark",
      price: String(item.price ?? ""),
      city: item.location?.city || "",
      country: item.location?.country || "",
      address: item.location?.address || "",
      lat: String(item.location?.lat ?? ""),
      lng: String(item.location?.lng ?? ""),
      images: Array.isArray(item.images) ? item.images.join(", ") : (item.images || ""),
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttraction?.id) return;
    try {
      setIsSubmitting(true);
      const payload = {
        title: editFormData.title,
        description: editFormData.description,
        type: editFormData.type,
        price: Number(editFormData.price),
        images: editFormData.images.split(",").map(i => i.trim()).filter(i => i),
        location: {
          city: editFormData.city,
          country: editFormData.country,
          address: editFormData.address,
          lat: Number(editFormData.lat) || 0,
          lng: Number(editFormData.lng) || 0,
        }
      };

      await api.patch(`/admin/attractions/${editingAttraction.id}`, payload);
      toast.success("Attraction updated successfully");
      setIsEditModalOpen(false);
      setEditingAttraction(null);
      fetchAttractions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update attraction");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Bulk upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      setUploading(true);
      const res = await api.post("/admin/attractions/bulk", uploadFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message || "Bulk upload successful");
      setPage(1);
      fetchAttractions();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadSample = () => {
    const data = [
      {
        title: "Eiffel Tower",
        description: "Iconic iron lattice tower on the Champ de Mars.",
        type: "Landmark",
        price: 25,
        city: "Paris",
        country: "France",
        address: "Champ de Mars, 5 Av. Anatole France",
        lat: 48.8584,
        lng: 2.2945,
        images: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f"
      }
    ];

    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attractions");
      XLSX.writeFile(workbook, "attractions_bulk_template.xlsx");
    } catch (err) {
      toast.error("Failed to generate template");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this attraction?")) return;
    try {
      await api.delete(`/admin/attractions/${id}`);
      toast.success("Attraction deleted");
      fetchAttractions();
    } catch {
      toast.error("Failed to delete attraction");
    }
  };

  // ── Shared form fields renderer ───────────────────────────────────────────
  const renderFormFields = (
    data: typeof EMPTY_FORM,
    setData: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
  ) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2 col-span-2">
        <label className="text-sm font-medium">Attraction Title</label>
        <Input
          required
          placeholder="e.g. Burj Khalifa"
          value={data.title}
          onChange={e => setData(d => ({ ...d, title: e.target.value }))}
        />
      </div>
      <div className="space-y-2 col-span-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          required
          className="w-full min-h-[100px] px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Tell us about this attraction..."
          value={data.description}
          onChange={e => setData(d => ({ ...d, description: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <select
          className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
          value={data.type}
          onChange={e => setData(d => ({ ...d, type: e.target.value }))}
        >
          <option value="Landmark">Landmark</option>
          <option value="Museum">Museum</option>
          <option value="Park">Park</option>
          <option value="Adventure">Adventure</option>
          <option value="Culture">Culture</option>
          <option value="Nature">Nature</option>
          <option value="Tour">Tour</option>
          <option value="Beach">Beach</option>
          <option value="Temple">Temple</option>
          <option value="Shopping">Shopping</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Entry Price (₹)</label>
        <Input
          required
          type="number"
          placeholder="0.00"
          value={data.price}
          onChange={e => setData(d => ({ ...d, price: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">City</label>
        <Input
          required
          placeholder="Agra"
          value={data.city}
          onChange={e => setData(d => ({ ...d, city: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Country</label>
        <Input
          required
          placeholder="India"
          value={data.country}
          onChange={e => setData(d => ({ ...d, country: e.target.value }))}
        />
      </div>
      <div className="space-y-2 col-span-2">
        <label className="text-sm font-medium">Full Address</label>
        <Input
          required
          placeholder="123 Street Name, Area"
          value={data.address}
          onChange={e => setData(d => ({ ...d, address: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Latitude (Optional)</label>
        <Input
          placeholder="27.1751"
          value={data.lat}
          onChange={e => setData(d => ({ ...d, lat: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Longitude (Optional)</label>
        <Input
          placeholder="78.0421"
          value={data.lng}
          onChange={e => setData(d => ({ ...d, lng: e.target.value }))}
        />
      </div>
      <div className="space-y-2 col-span-2">
        <label className="text-sm font-medium">Image URLs (Comma separated)</label>
        <Input
          placeholder="https://image1.jpg, https://image2.jpg"
          value={data.images}
          onChange={e => setData(d => ({ ...d, images: e.target.value }))}
        />
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 shadow-sm">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Attraction Management</h1>
            <p className="text-sm text-slate-500">Manage listings and bulk import via Excel.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={downloadSample} className="h-9 gap-2">
            <Download className="h-4 w-4" /> Template
          </Button>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-9 gap-2 border-violet-200 text-violet-600 hover:bg-violet-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Bulk Upload
          </Button>
          
          <Button 
            size="sm" 
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 gap-2 bg-violet-500 hover:bg-violet-600"
          >
            <Plus className="h-4 w-4" /> Add New
          </Button>
        </div>
      </div>

      {/* ── Add New Attraction Modal ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Attraction</DialogTitle>
            <DialogDescription>Fill in the details to list a new attraction on the platform.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            {renderFormFields(formData, setFormData as any)}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-700">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Attraction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Attraction Modal ── */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        if (!open) { setIsEditModalOpen(false); setEditingAttraction(null); }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Attraction</DialogTitle>
            <DialogDescription>
              Update the details for <span className="font-semibold text-slate-800">{editingAttraction?.title}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 py-4">
            {renderFormFields(editFormData, setEditFormData as any)}
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsEditModalOpen(false); setEditingAttraction(null); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-700">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search attractions by title or description..."
              className="pl-9 h-10 text-sm focus-visible:ring-violet-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" className="h-10 bg-slate-900 hover:bg-slate-800 text-white px-6">Search</Button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
        ) : attractions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileSpreadsheet className="h-8 w-8 text-slate-200" />
            </div>
            <p className="text-base font-medium text-slate-900">No attractions found</p>
            <p className="text-sm">Try adjusting your search or upload some via Excel.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["Attraction", "Type", "Price", "Location", "Actions"].map(h => (
                      <th key={h} className="text-left p-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attractions.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {item.images?.[0] ? (
                            <img src={item.images[0]} alt={item.title} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-100" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-100">
                              <MapPin className="h-6 w-6 text-slate-300" />
                            </div>
                          )}
                          <div className="max-w-[250px]">
                            <p className="font-bold text-slate-900 truncate">{item.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{item.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-600 text-[10px] font-bold uppercase tracking-wider border border-violet-100">
                          {item.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-900 text-base">₹{item.price}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <MapPin className="h-3 w-3 text-violet-500" />
                            <span className="text-xs">{item.location?.city || "N/A"}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 pl-4">{item.location?.country || "N/A"}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit attraction"
                            className="h-9 w-9 text-slate-400 hover:text-violet-500 hover:bg-violet-50"
                            onClick={() => handleEditOpen(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Delete attraction"
                            className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > LIMIT && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/30">
                <p className="text-xs text-slate-500 font-medium">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} attractions</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-9 text-xs font-semibold px-4">Previous</Button>
                  <Button size="sm" variant="outline" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="h-9 text-xs font-semibold px-4">Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAttractions;
