/* eslint-disable @typescript-eslint/no-explicit-any */
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, Edit, Edit2, Trash2, Bed, Users, Users2, Square, ImageIcon, MoreVertical, Search, X, 
  Loader2, IndianRupee, Layers, Upload, Info, Settings, CigaretteOff, PawPrint, Clock4, 
  Waves, Mountain, Palmtree, Wifi, Coffee, Tv, Monitor, CheckSquare, CheckCircle, 
  Calendar, DollarSign, Percent, Star, Maximize, Shield, ChevronDown, ChevronUp,
  MapPin, Check
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { getAmenityIcon } from "@/utils/amenityIcons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const AMENITY_GROUPS = [
  {
    label: "Core Comfort",
    items: ["Air conditioning", "Free WiFi", "Heating", "Soundproof room", "Iron", "Ironing facilities", "Safe"]
  },
  {
    label: "Entertainment",
    items: ["TV", "Flat-screen TV", "Smart TV", "Satellite channels", "Streaming service", "Telephone"]
  },
  {
    label: "Refreshments",
    items: ["Coffee machine", "Tea/Coffee maker", "Minibar", "Refrigerator"]
  },
  {
    label: "Bathroom",
    items: ["Bathrobe", "Slippers", "Towels", "Toiletries", "Hot water", "Bathtub", "Shower", "Attached bathroom", "Toilet", "Cleaning products", "Hair dryer"]
  },
  {
    label: "Living Space",
    items: ["Wardrobe", "Desk", "Sitting area", "Sofa", "Socket near bed"]
  }
];

const VIEW_OPTIONS = [
  "City view", "Garden view", "Pool view", "Sea view", "Mountain view", "Balcony", "Terrace"
];

const CATEGORIES = ["Standard", "Deluxe", "Suite", "Family Room", "Villa", "Other"];

const OwnerRooms = () => {
  const [searchParams] = useSearchParams();
  const stayId = searchParams.get("stayId");
  
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [stayName, setStayName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomImages, setRoomImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expanded Form State
  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    description: "",
    category: "Standard",
    status: "Active",
    pricePerNight: "",
    maxAdults: 2,
    maxChildren: 0,
    maxTotalGuests: 2,
    childAgePolicy: "",
    extraBedAllowed: false,
    cribAvailable: false,
    recommendedFor: "2 adults",
    bedType: "King Bed",
    numBeds: 1,
    bedSize: "Extra-large",
    separateBedding: false,
    sofaBed: false,
    extraBedNote: "",
    roomSize: "",
    floor: "",
    amenities: [] as string[],
    views: [] as string[],
    
    // Policies
    freeCancellation: true,
    cancellationDeadline: "24",
    noPrepayment: false,
    payAtProperty: true,
    noCreditCard: false,
    breakfastIncluded: true,
    breakfastType: "Buffet",
    taxFeeNote: "",
    refundPolicy: "",
    smokingAllowed: false,
    petFriendly: false,
    interconnecting: false,
    lateCheckIn: false,

    // Pricing & Availability
    priceFor2Nights: "",
    taxAmount: "",
    serviceFee: "",
    discountPercentage: "",
    seasonalPrice: "",
    weekendPrice: "",
    extraBedPrice: "",
    childPriceNote: "",
    totalRooms: 1,
    availableRooms: 1,
    soldOut: false,
    minStay: 1,
    maxStay: 30,
    checkInOutRestrictions: "",
    badges: [] as string[]
  });

  const fetchRooms = async () => {
    if (!stayId) { setLoading(false); return; }
    try {
      setLoading(true);
      const [roomsRes, stayRes] = await Promise.all([
        api.get(`/stays/${stayId}/rooms`),
        api.get(`/stays/${stayId}`).catch(() => null),
      ]);
      setRooms(roomsRes.data.data || []);
      if (stayRes) {
        const d = stayRes.data?.data || stayRes.data;
        setStayName(d?.title || d?.name || "");
      }
    } catch (error) {
      toast.error("Failed to load rooms");
      // Clear stored stayId if it's no longer valid
      localStorage.removeItem("tm_last_stayId");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stayId) {
      // Remember the last viewed property's rooms
      localStorage.setItem("tm_last_stayId", stayId);
      fetchRooms();
    } else {
      // No stayId — check localStorage first, then load property list
      const lastStayId = localStorage.getItem("tm_last_stayId");
      if (lastStayId) {
        navigate(`/owner/rooms?stayId=${lastStayId}`, { replace: true });
        return;
      }
      api.get("/stays/owner/properties")
        .then(res => {
          const d = res.data.data;
          const list = d?.stays || (Array.isArray(d) ? d : []);
          if (list.length > 0) {
            // Auto-redirect to first property's rooms
            navigate(`/owner/rooms?stayId=${list[0].id}`, { replace: true });
          } else {
            setProperties(list);
            setLoading(false);
          }
        })
        .catch(() => { toast.error("Failed to load properties"); setLoading(false); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stayId]);

  useEffect(() => {
    if (editingRoom) {
      const opts = editingRoom.options || {};
      setRoomImages(opts.images || editingRoom.images || []);
      setFormData({
        name: editingRoom.name || "",
        shortName: opts.shortName || "",
        description: opts.description || "",
        category: opts.category || "Standard",
        status: opts.status || "Active",
        pricePerNight: String(editingRoom.pricePerNight || ""),
        maxAdults: editingRoom.maxGuests || opts.occupancy?.maxAdults || 2,
        maxChildren: opts.occupancy?.maxChildren || 0,
        maxTotalGuests: opts.occupancy?.maxTotalGuests || 2,
        childAgePolicy: opts.occupancy?.childAgePolicy || "",
        extraBedAllowed: opts.occupancy?.extraBedAllowed || false,
        cribAvailable: opts.occupancy?.cribAvailable || false,
        recommendedFor: opts.occupancy?.recommendedFor || "2 adults",
        bedType: editingRoom.bedType || "King Bed",
        numBeds: opts.beds?.numBeds || 1,
        bedSize: opts.beds?.bedSize || "Extra-large",
        separateBedding: opts.beds?.separateBedding || false,
        sofaBed: opts.beds?.sofaBed || false,
        extraBedNote: opts.beds?.extraBedNote || "",
        roomSize: opts.roomSize || "",
        floor: opts.floor || "",
        amenities: editingRoom.amenities || [],
        views: opts.views || [],
        freeCancellation: opts.policies?.freeCancellation ?? true,
        cancellationDeadline: opts.policies?.cancellationDeadline || "24",
        noPrepayment: opts.policies?.noPrepayment || false,
        payAtProperty: opts.policies?.payAtProperty || true,
        noCreditCard: opts.policies?.noCreditCard || false,
        breakfastIncluded: opts.policies?.breakfastIncluded || true,
        breakfastType: opts.policies?.breakfastType || "Buffet",
        taxFeeNote: opts.policies?.taxFeeNote || "",
        refundPolicy: opts.policies?.refundPolicy || "",
        smokingAllowed: opts.policies?.smokingAllowed || false,
        petFriendly: opts.policies?.petFriendly || false,
        interconnecting: opts.policies?.interconnecting || false,
        lateCheckIn: opts.policies?.lateCheckIn || false,
        priceFor2Nights: opts.pricing?.priceFor2Nights || "",
        taxAmount: opts.pricing?.taxAmount || "",
        serviceFee: opts.pricing?.serviceFee || "",
        discountPercentage: opts.pricing?.discountPercentage || "",
        seasonalPrice: opts.pricing?.seasonalPrice || "",
        weekendPrice: opts.pricing?.weekendPrice || "",
        extraBedPrice: opts.pricing?.extraBedPrice || "",
        childPriceNote: opts.pricing?.childPriceNote || "",
        totalRooms: opts.availability?.totalRooms || 1,
        availableRooms: opts.availability?.availableRooms || 1,
        soldOut: opts.availability?.soldOut || false,
        minStay: opts.availability?.minStay || 1,
        maxStay: opts.availability?.maxStay || 30,
        checkInOutRestrictions: opts.availability?.checkInOutRestrictions || "",
        badges: opts.badges || []
      });
    } else {
      setRoomImages([]);
      setFormData({
        name: "", shortName: "", description: "", category: "Standard", status: "Active",
        pricePerNight: "", maxAdults: 2, maxChildren: 0, maxTotalGuests: 2,
        childAgePolicy: "", extraBedAllowed: false, cribAvailable: false,
        recommendedFor: "2 adults", bedType: "King Bed", numBeds: 1,
        bedSize: "Extra-large", separateBedding: false, sofaBed: false,
        extraBedNote: "", roomSize: "", floor: "", amenities: [], views: [],
        freeCancellation: true, cancellationDeadline: "24", noPrepayment: false,
        payAtProperty: true, noCreditCard: false, breakfastIncluded: true,
        breakfastType: "Buffet", taxFeeNote: "", refundPolicy: "",
        smokingAllowed: false, petFriendly: false, interconnecting: false,
        lateCheckIn: false, priceFor2Nights: "", taxAmount: "", serviceFee: "",
        discountPercentage: "", seasonalPrice: "", weekendPrice: "",
        extraBedPrice: "", childPriceNote: "", totalRooms: 1, availableRooms: 1,
        soldOut: false, minStay: 1, maxStay: 30, checkInOutRestrictions: "",
        badges: []
      });
    }
  }, [editingRoom]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append("files", files[i]);

    try {
      setIsUploading(true);
      const response = await api.post("/upload/multiple", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        const newUrls = response.data.data.files.map((file: any) => file.fileUrl);
        setRoomImages((prev) => [...prev, ...newUrls]);
        toast.success(`${files.length} images uploaded`);
      }
    } catch (error) { toast.error("Upload failed"); } 
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.pricePerNight) {
      toast.error("Basic info (name and price) is required.");
      return;
    }

    const payload = {
      name: formData.name,
      pricePerNight: Number(formData.pricePerNight),
      maxGuests: Number(formData.maxTotalGuests),
      bedType: formData.bedType,
      amenities: formData.amenities,
      options: {
        images: roomImages,
        shortName: formData.shortName,
        description: formData.description,
        category: formData.category,
        status: formData.status,
        occupancy: {
          maxAdults: formData.maxAdults,
          maxChildren: formData.maxChildren,
          maxTotalGuests: formData.maxTotalGuests,
          childAgePolicy: formData.childAgePolicy,
          extraBedAllowed: formData.extraBedAllowed,
          cribAvailable: formData.cribAvailable,
          recommendedFor: formData.recommendedFor
        },
        beds: {
          numBeds: formData.numBeds,
          bedSize: formData.bedSize,
          separateBedding: formData.separateBedding,
          sofaBed: formData.sofaBed,
          extraBedNote: formData.extraBedNote
        },
        roomSize: formData.roomSize,
        floor: formData.floor,
        views: formData.views,
        policies: {
          freeCancellation: formData.freeCancellation,
          cancellationDeadline: formData.cancellationDeadline,
          noPrepayment: formData.noPrepayment,
          payAtProperty: formData.payAtProperty,
          noCreditCard: formData.noCreditCard,
          breakfastIncluded: formData.breakfastIncluded,
          breakfastType: formData.breakfastType,
          taxFeeNote: formData.taxFeeNote,
          refundPolicy: formData.refundPolicy,
          smokingAllowed: formData.smokingAllowed,
          petFriendly: formData.petFriendly,
          interconnecting: formData.interconnecting,
          lateCheckIn: formData.lateCheckIn
        },
        pricing: {
          priceFor2Nights: formData.priceFor2Nights,
          taxAmount: formData.taxAmount,
          serviceFee: formData.serviceFee,
          discountPercentage: formData.discountPercentage,
          seasonalPrice: formData.seasonalPrice,
          weekendPrice: formData.weekendPrice,
          extraBedPrice: formData.extraBedPrice,
          childPriceNote: formData.childPriceNote
        },
        availability: {
          totalRooms: formData.totalRooms,
          availableRooms: formData.availableRooms,
          soldOut: formData.soldOut,
          minStay: formData.minStay,
          maxStay: formData.maxStay,
          checkInOutRestrictions: formData.checkInOutRestrictions
        },
        badges: formData.badges
      }
    };

    try {
      if (editingRoom) {
        await api.put(`/stays/${stayId}/rooms/${editingRoom.id}`, payload);
        toast.success("Room updated");
      } else {
        await api.post(`/stays/${stayId}/rooms`, payload);
        toast.success("Room added successfully!");
      }
      setShowForm(false);
      setEditingRoom(null);
      fetchRooms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save room");
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const toggleView = (view: string) => {
    setFormData(prev => ({
      ...prev,
      views: prev.views.includes(view)
        ? prev.views.filter(v => v !== view)
        : [...prev.views, view]
    }));
  };

  if (loading) return <OwnerLayout><div className="h-[60vh] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div></OwnerLayout>;

  // No stayId — show property selector
  if (!stayId) {
    return (
      <OwnerLayout>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Room Management</h1>
          <p className="text-sm text-slate-500 mt-1">Select a property to manage its rooms.</p>
        </div>
        {properties.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
            <Bed className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900">No properties yet</h2>
            <p className="text-slate-500 mt-1 mb-6 max-w-xs mx-auto">Add a property first before managing rooms.</p>
            <button
              onClick={() => navigate("/owner/properties")}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              Go to Properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/owner/rooms?stayId=${p.id}`)}
                className="bg-white border border-slate-100 rounded-3xl overflow-hidden group hover:shadow-2xl hover:border-primary/20 transition-all duration-500 text-left"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={p.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    alt={p.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-3 left-4 bg-primary/90 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-md">
                    {p.type}
                  </span>
                  <span className={`absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                    p.moderationStatus === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>{p.moderationStatus || "PENDING"}</span>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{p.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary" />{p.city}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Manage Rooms →</span>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <Bed className="h-4 w-4 text-primary group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate("/owner/properties")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-primary transition-colors mb-2 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back to Properties
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Room Management</h1>
          {stayName && (
            <p className="text-sm text-primary font-semibold mt-0.5">{stayName}</p>
          )}
          <p className="text-sm text-slate-500 mt-1">Configure your room units for customer-facing display.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4 mr-2" /> Add New Room
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          {/* Form Header */}
          <div className="bg-slate-900 px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                <Bed className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{editingRoom ? "Edit Room Unit" : "Add New Room Unit"}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Inventory Management</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="rounded-xl text-slate-400 hover:text-white hover:bg-white/10" onClick={() => { setShowForm(false); setEditingRoom(null); }}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
          </div>

          <div className="p-8 lg:p-10 space-y-12">
            {/* 1) Basic Room Info */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">1. Basic Room Info</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Room Title / Type</label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Deluxe King Suite" className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Short Name</label>
                  <Input value={formData.shortName} onChange={e => setFormData({...formData, shortName: e.target.value})} placeholder="e.g. King-Deluxe" className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                  <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                    <SelectTrigger className="h-12 border-slate-200 rounded-xl">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Number of Rooms</label>
                  <Input type="number" min="1" value={formData.totalRooms} onChange={e => setFormData({...formData, totalRooms: Number(e.target.value)})} placeholder="e.g. 5" className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                  <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the unique features of this room..." className="min-h-[100px] border-slate-200 rounded-xl resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</label>
                  <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                    <SelectTrigger className="h-12 border-slate-200 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* 2) Occupancy / Guest Rules */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">2. Occupancy & Guest Rules</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Max Adults</label>
                  <Input type="number" value={formData.maxAdults} onChange={e => setFormData({...formData, maxAdults: Number(e.target.value)})} className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Max Children</label>
                  <Input type="number" value={formData.maxChildren} onChange={e => setFormData({...formData, maxChildren: Number(e.target.value)})} className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Guests</label>
                  <Input type="number" value={formData.maxTotalGuests} onChange={e => setFormData({...formData, maxTotalGuests: Number(e.target.value)})} className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Child Age Policy</label>
                  <Input value={formData.childAgePolicy} onChange={e => setFormData({...formData, childAgePolicy: e.target.value})} placeholder="e.g. Children up to 12 years free" className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recommend For</label>
                  <Input value={formData.recommendedFor} onChange={e => setFormData({...formData, recommendedFor: e.target.value})} placeholder="e.g. 2 Adults + 1 Child" className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="col-span-full flex flex-wrap gap-10 pt-2">
                  <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setFormData({...formData, extraBedAllowed: !formData.extraBedAllowed})}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.extraBedAllowed ? "bg-primary border-primary" : "border-slate-300 group-hover:border-primary"}`}>
                      {formData.extraBedAllowed && <Check className="h-3 w-3 text-white stroke-[4]" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">Extra bed allowed</span>
                  </div>
                  <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setFormData({...formData, cribAvailable: !formData.cribAvailable})}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.cribAvailable ? "bg-primary border-primary" : "border-slate-300 group-hover:border-primary"}`}>
                      {formData.cribAvailable && <Check className="h-3 w-3 text-white stroke-[4]" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">Crib available</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 3) Bed Details */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-6 bg-violet-500 rounded-full" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">3. Bed Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bed Type</label>
                  <Select value={formData.bedType} onValueChange={v => setFormData({...formData, bedType: v})}>
                    <SelectTrigger className="h-12 border-slate-200 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="King Bed">King Bed</SelectItem>
                      <SelectItem value="Queen Bed">Queen Bed</SelectItem>
                      <SelectItem value="Twin Beds">Twin Beds</SelectItem>
                      <SelectItem value="Single Bed">Single Bed</SelectItem>
                      <SelectItem value="Double Bed">Double Bed</SelectItem>
                      <SelectItem value="Sofa Bed">Sofa Bed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Number of Beds</label>
                  <Input type="number" value={formData.numBeds} onChange={e => setFormData({...formData, numBeds: Number(e.target.value)})} className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bed Size</label>
                  <Input value={formData.bedSize} onChange={e => setFormData({...formData, bedSize: e.target.value})} placeholder="e.g. 180-200 cm" className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extra Bed Note</label>
                   <Input value={formData.extraBedNote} onChange={e => setFormData({...formData, extraBedNote: e.target.value})} placeholder="Charges or restrictions..." className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="col-span-full flex flex-wrap gap-10 pt-2">
                   <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setFormData({...formData, separateBedding: !formData.separateBedding})}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.separateBedding ? "bg-primary border-primary" : "border-slate-300 group-hover:border-primary"}`}>
                      {formData.separateBedding && <Check className="h-3 w-3 text-white stroke-[4]" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">Separate bedding options</span>
                  </div>
                  <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setFormData({...formData, sofaBed: !formData.sofaBed})}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.sofaBed ? "bg-primary border-primary" : "border-slate-300 group-hover:border-primary"}`}>
                      {formData.sofaBed && <Check className="h-3 w-3 text-white stroke-[4]" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">Includes sofa bed</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 4) Room Size and View */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">4. Space & Views</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Room Size (m²)</label>
                    <Input value={formData.roomSize} onChange={e => setFormData({...formData, roomSize: e.target.value})} placeholder="e.g. 45" className="h-12 border-slate-200 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Floor Number</label>
                    <Input value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} placeholder="e.g. 12" className="h-12 border-slate-200 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Select Views</label>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {VIEW_OPTIONS.map(view => (
                      <div key={view} className="flex items-center space-x-2.5 cursor-pointer group" onClick={() => toggleView(view)}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${formData.views.includes(view) ? "bg-primary border-primary" : "border-slate-300"}`}>
                          {formData.views.includes(view) && <Check className="h-2.5 w-2.5 text-white stroke-[4]" />}
                        </div>
                        <span className="text-xs font-medium text-slate-600">{view}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 5) Room Features / Amenities */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">5. Amenities & Features</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-10">
                {AMENITY_GROUPS.map(group => (
                  <div key={group.label} className="space-y-4">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-slate-100 pb-2">{group.label}</h4>
                    <div className="space-y-3">
                      {group.items.map(item => {
                        const Icon = getAmenityIcon(item);
                        return (
                          <div key={item} className="flex items-center space-x-2.5 cursor-pointer group" onClick={() => toggleAmenity(item)}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${formData.amenities.includes(item) ? "bg-primary border-primary" : "border-slate-200"}`}>
                              {formData.amenities.includes(item) && <Check className="h-2.5 w-2.5 text-white stroke-[4]" />}
                            </div>
                            <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors flex-shrink-0" />
                            <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 6) Room Policies */}
            <section className="bg-slate-50 p-8 lg:p-10 rounded-[2rem] border border-slate-100">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">6. Room Policies</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-700">Free Cancellation</span>
                     <Checkbox checked={formData.freeCancellation} onCheckedChange={checked => setFormData({...formData, freeCancellation: !!checked})} />
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-700">No Prepayment</span>
                     <Checkbox checked={formData.noPrepayment} onCheckedChange={checked => setFormData({...formData, noPrepayment: !!checked})} />
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-700">Pay at Property</span>
                     <Checkbox checked={formData.payAtProperty} onCheckedChange={checked => setFormData({...formData, payAtProperty: !!checked})} />
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-700">Breakfast Included</span>
                     <Checkbox checked={formData.breakfastIncluded} onCheckedChange={checked => setFormData({...formData, breakfastIncluded: !!checked})} />
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-700">Pet Friendly</span>
                     <Checkbox checked={formData.petFriendly} onCheckedChange={checked => setFormData({...formData, petFriendly: !!checked})} />
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-700">Smoking Allowed</span>
                     <Checkbox checked={formData.smokingAllowed} onCheckedChange={checked => setFormData({...formData, smokingAllowed: !!checked})} />
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cancellation Deadline</label>
                   <Select value={formData.cancellationDeadline} onValueChange={v => setFormData({...formData, cancellationDeadline: v})}>
                     <SelectTrigger className="h-10 bg-white border-slate-200 rounded-xl">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="24">24 Hours</SelectItem>
                       <SelectItem value="48">48 Hours</SelectItem>
                       <SelectItem value="72">72 Hours</SelectItem>
                       <SelectItem value="7d">7 Days</SelectItem>
                     </SelectContent>
                   </Select>
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Breakfast Type</label>
                   <Input value={formData.breakfastType} onChange={e => setFormData({...formData, breakfastType: e.target.value})} placeholder="e.g. Continental" className="h-10 bg-white border-slate-200 rounded-xl" />
                </div>
              </div>
            </section>

            {/* 7) Pricing */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">7. Pricing Details (₹)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Price per Night</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input type="number" value={formData.pricePerNight} onChange={e => setFormData({...formData, pricePerNight: e.target.value})} className="h-12 pl-10 border-slate-200 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tax Amount</label>
                  <Input type="number" value={formData.taxAmount} onChange={e => setFormData({...formData, taxAmount: e.target.value})} className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Discount %</label>
                  <Input type="number" value={formData.discountPercentage} onChange={e => setFormData({...formData, discountPercentage: e.target.value})} className="h-12 border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extra Bed Price</label>
                   <Input type="number" value={formData.extraBedPrice} onChange={e => setFormData({...formData, extraBedPrice: e.target.value})} className="h-12 border-slate-200 rounded-xl" />
                </div>
              </div>
            </section>

            {/* 8) Availability */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-6 bg-sky-500 rounded-full" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">8. Inventory & Availability</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Min Stay</label>
                   <Input type="number" value={formData.minStay} onChange={e => setFormData({...formData, minStay: Number(e.target.value)})} className="h-12 border-slate-200 rounded-xl" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Max Stay</label>
                   <Input type="number" value={formData.maxStay} onChange={e => setFormData({...formData, maxStay: Number(e.target.value)})} className="h-12 border-slate-200 rounded-xl" />
                 </div>
                 <div className="col-span-2 flex items-center space-x-4 pt-8">
                   <Checkbox checked={formData.soldOut} onCheckedChange={checked => setFormData({...formData, soldOut: !!checked})} />
                   <span className="text-sm font-bold text-slate-700">Mark as Sold Out</span>
                 </div>
              </div>
            </section>

            {/* 9) Room Photos */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-6 bg-pink-500 rounded-full" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">9. Room Photography</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                   <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50 hover:bg-slate-50 hover:border-primary/30 transition-all cursor-pointer relative group" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="image/*" className="hidden" />
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Processing Assets...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                          <Upload className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Drop your room photos here</p>
                          <p className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-widest">PNG, JPG or WebP (Max 10MB each)</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Input value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} placeholder="Or paste an image URL directly..." className="h-12 border-slate-200 rounded-xl" />
                    <Button type="button" variant="outline" onClick={() => { if(manualUrl) { setRoomImages([...roomImages, manualUrl]); setManualUrl(""); } }} className="h-12 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest">Add Link</Button>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 max-h-[400px] overflow-y-auto">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Gallery Preview ({roomImages.length})</h4>
                   {roomImages.length === 0 ? (
                     <div className="h-32 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase">No images yet</div>
                   ) : (
                     <div className="grid grid-cols-2 gap-3">
                       {roomImages.map((url, idx) => (
                         <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-white shadow-sm ring-1 ring-slate-200/50">
                           <img src={url} className="w-full h-full object-cover" />
                           <button onClick={(e) => { e.stopPropagation(); setRoomImages(roomImages.filter((_, i) => i !== idx)); }} className="absolute top-1.5 right-1.5 bg-destructive text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                             <Trash2 className="h-3 w-3" />
                           </button>
                           {idx === 0 && <div className="absolute bottom-0 left-0 right-0 bg-primary/90 py-1 text-[8px] font-black text-white text-center uppercase tracking-tighter">Primary Photo</div>}
                         </div>
                       ))}
                     </div>
                   )}
                </div>
              </div>
            </section>

            <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row gap-4">
              <Button onClick={handleSave} disabled={isUploading} className="flex-1 h-16 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/30 transition-all active:scale-[0.98]">
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : editingRoom ? "Update Room Listing" : "Publish Room to Portal"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingRoom(null); }} className="h-16 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-200">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Room Listing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-20">
        {rooms && rooms.length > 0 ? (
          rooms.map((room) => (
            <div key={room.id} className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 group animate-in fade-in slide-in-from-bottom-8">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img 
                  src={room.options?.images?.[0] || room.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} 
                  alt={room.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                <div className="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-10">
                  <Button size="icon" variant="secondary" className="h-12 w-12 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl hover:scale-110 transition-transform border border-white/20" onClick={(e) => { e.stopPropagation(); setEditingRoom(room); setShowForm(true); }}>
                    <Edit2 className="h-5 w-5 text-slate-900" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-12 w-12 rounded-2xl shadow-xl hover:scale-110 transition-transform border border-white/10" onClick={(e) => { e.stopPropagation(); if(confirm("Delete room?")) api.delete(`/stays/${stayId}/rooms/${room.id}`).then(() => fetchRooms()); }}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
                <div className="absolute bottom-6 left-8">
                  <div className="bg-white/20 backdrop-blur-xl text-white px-5 py-2.5 rounded-2xl text-[10px] font-black border border-white/30 flex items-center gap-3 uppercase tracking-widest shadow-2xl">
                    <Users2 className="h-4 w-4 text-emerald-400" /> {room.maxGuests} Guests
                  </div>
                </div>
              </div>
              
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">{room.options?.category || "Room Unit"}</p>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight mb-1 truncate">{room.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                       <Bed className="h-3 w-3 text-slate-400" />
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{room.bedType}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{Number(room.pricePerNight).toLocaleString()}</p>
                    <p className="text-[8px] uppercase tracking-widest font-black text-slate-400">per unit night</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-10 min-h-[40px]">
                  {(room.amenities || []).slice(0, 4).map((amenity: string, idx: number) => {
                    const Icon = getAmenityIcon(amenity);
                    return (
                      <span key={idx} className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-100 flex items-center gap-2">
                        <Icon className="h-3 w-3 text-slate-400" />
                        {amenity}
                      </span>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {(room.images || []).slice(0, 3).map((img: string, i: number) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-100 shadow-md">
                          <img src={img} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {room.images?.length || 0} Assets • {room.options?.availability?.totalRooms || 1} Rooms Available
                    </p>
                  </div>
                  <Button variant="ghost" className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 flex flex-col items-center justify-center bg-slate-50/50 border-4 border-dashed border-slate-100 rounded-[4rem] group transition-all hover:bg-slate-50 hover:border-slate-200">
            <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-200 mb-8 group-hover:scale-110 transition-transform duration-500">
              <Bed className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">No room units found</h3>
            <p className="text-slate-500 max-w-sm text-center mb-10 font-medium leading-relaxed px-6">Your property listing won't be visible until you add at least one room unit.</p>
            <Button onClick={() => setShowForm(true)} className="rounded-2xl px-8 h-12 shadow-xl shadow-primary/20">
              <Plus className="h-5 w-5 mr-2" /> Initialize Inventory
            </Button>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
};

export default OwnerRooms;
