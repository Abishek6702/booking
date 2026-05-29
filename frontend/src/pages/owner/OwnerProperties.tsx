/* eslint-disable @typescript-eslint/no-explicit-any */
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Edit, Trash2, MapPin, Bed, Star, MoreHorizontal, LayoutGrid, List, X, Loader2, Info, Download, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { getAmenityIcon } from "@/utils/amenityIcons";

const AMENITY_CATEGORIES = [
  {
    title: "Room Features",
    amenities: [
      "Free WiFi", "Air Conditioning", "Heating", "Fan", "Smart TV", "Cable TV", "Streaming Services", "Telephone",
      "Room Service", "Mini Bar", "Refrigerator", "Microwave", "Coffee Maker", "Tea/Coffee Maker", "Electric Kettle",
      "Dining Area", "Dining Table", "Kitchenette", "Full Kitchen", "Washing Machine", "Dryer", "Iron", "Ironing Board",
      "Hair Dryer", "Toiletries", "Bathrobe", "Slippers", "Towels", "Hot Water", "Bathtub", "Jacuzzi", "Rain Shower",
      "Private Bathroom", "Shared Bathroom", "Balcony", "Terrace", "Patio", "Garden View", "Sea View", "Mountain View",
      "Lake View", "Pool View", "City View", "Soundproof Rooms", "Blackout Curtains", "Safe Locker", "Wardrobe",
      "Desk", "Sofa", "King Bed", "Queen Bed", "Twin Beds", "Bunk Bed", "Extra Bed", "Baby Crib", "Accessible Room"
    ]
  },
  {
    title: "Dining & Food",
    amenities: [
      "Restaurant", "Cafe", "Coffee Shop", "Bar", "Pool Bar", "Snack Bar", "Lounge", "Breakfast Included",
      "Buffet Breakfast", "Continental Breakfast", "American Breakfast", "Asian Breakfast", "Vegetarian Food",
      "Vegan Food", "Halal Food", "Kosher Food", "BBQ Facilities", "Private Dining", "Fine Dining", "Outdoor Dining",
      "24-Hour Room Service"
    ]
  },
  {
    title: "Wellness & Spa",
    amenities: [
      "Swimming Pool", "Outdoor Pool", "Indoor Pool", "Infinity Pool", "Kids Pool", "Private Pool", "Rooftop Pool",
      "Pool With View", "Spa", "Sauna", "Steam Room", "Hot Tub", "Massage Center", "Wellness Center", "Yoga Room",
      "Meditation Area", "Fitness Center", "Gym", "Beauty Salon"
    ]
  },
  {
    title: "Outdoor & Leisure",
    amenities: [
      "Private Beach", "Beach Access", "Beachfront", "Garden", "Picnic Area", "Sun Terrace", "Sun Loungers",
      "Bonfire Area", "Camping Area", "Outdoor Fireplace", "Rooftop Lounge", "Game Room", "Indoor Games",
      "Outdoor Games", "Board Games", "Billiards", "Table Tennis", "Tennis Court", "Badminton Court",
      "Basketball Court", "Volleyball Court", "Golf Course", "Mini Golf", "Bowling", "Cycling", "Bike Rental",
      "Hiking", "Trekking", "Horse Riding", "Fishing", "Boating", "Kayaking", "Water Sports", "Snorkeling",
      "Scuba Diving", "Surfing", "Skiing", "Karaoke", "Live Music", "DJ", "Nightclub", "Movie Screening"
    ]
  },
  {
    title: "Family & Kids",
    amenities: [
      "Family Rooms", "Kids Play Area", "Kids Club", "Kids Activities", "Babysitting", "Childcare",
      "Children’s Pool", "Kids Meals", "High Chair", "Family Entertainment", "Stroller Friendly"
    ]
  },
  {
    title: "Business & Events",
    amenities: [
      "Conference Hall", "Meeting Room", "Banquet Hall", "Business Center", "Coworking Space", "Event Space",
      "Wedding Hall", "Projector", "Printer", "Fax Service", "Whiteboard", "Work Desk"
    ]
  },
  {
    title: "Transportation & Parking",
    amenities: [
      "Free Parking", "Private Parking", "Paid Parking", "Street Parking", "Valet Parking", "Accessible Parking",
      "EV Charging Station", "Airport Shuttle", "Airport Pickup", "Airport Drop", "Shuttle Service", "Taxi Service",
      "Car Rental", "Bicycle Parking", "Motorbike Rental"
    ]
  },
  {
    title: "Accessibility",
    amenities: [
      "Wheelchair Accessible", "Elevator", "Ramp Access", "Accessible Bathroom", "Braille Signage",
      "Visual Assistance", "Hearing Assistance", "Low Counter", "Emergency Cord Bathroom"
    ]
  },
  {
    title: "Guest Services",
    amenities: [
      "24-Hour Front Desk", "Express Check-In", "Express Check-Out", "Concierge", "Luggage Storage", "Tour Desk",
      "Ticket Service", "Wake-Up Service", "Currency Exchange", "ATM", "Multilingual Staff", "Guest Relations",
      "Butler Service"
    ]
  },
  {
    title: "Housekeeping",
    amenities: [
      "Daily Housekeeping", "Laundry", "Dry Cleaning", "Ironing Service", "Shoe Shine", "Trouser Press",
      "Room Sanitization", "Linen Change", "Towel Change"
    ]
  },
  {
    title: "Safety & Security",
    amenities: [
      "24-Hour Security", "CCTV", "Security Guard", "Smoke Detector", "Fire Alarm", "Fire Extinguisher",
      "First Aid Kit", "Emergency Exit", "Key Card Access", "Safe Deposit Box"
    ]
  },
  {
    title: "Pet Friendly",
    amenities: [
      "Pet Friendly", "Pets Allowed", "Pet Bowls", "Pet Sitting", "Dog Walking Area", "Pet Grooming"
    ]
  },
  {
    title: "Specialized & Luxury",
    amenities: [
      "Luxury Suite", "Presidential Suite", "Villa", "Private Villa", "Honeymoon Suite", "Private Chef",
      "In-Room Spa", "Helipad", "Private Entrance", "VIP Room Facilities", "Signature Experience", "Eco Friendly",
      "Adults Only", "Couple Friendly", "Smoking Rooms", "Non-Smoking Rooms", "Connecting Rooms", "Lakefront",
      "Forest View", "Hilltop Resort", "River View", "Smart Room Controls", "Voice Assistant Room", "Digital Key Access",
      "Self Check-In"
    ]
  }
];

const AMENITIES_WITH_HOURS = [
  "Swimming Pool", "Outdoor Pool", "Indoor Pool", "Infinity Pool", "Kids Pool", "Private Pool", "Rooftop Pool",
  "Bar", "Pool Bar", "Snack Bar", "Gym", "Fitness Center", "Spa", "Sauna", "Steam Room", "Massage Center",
  "Wellness Center", "Restaurant", "Cafe", "Coffee Shop", "Breakfast Included", "Buffet Breakfast",
  "24-Hour Front Desk", "Concierge"
];

const OwnerProperties = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [propertyImages, setPropertyImages] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [amenityHours, setAmenityHours] = useState<Record<string, string>>({});
  const [amenitySearch, setAmenitySearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleExportCSV = () => {
    const headers = ["ID", "Title", "Type", "City", "Country", "Rating", "Status"];
    const data = properties.map(p => [
      p.id,
      p.title,
      p.type,
      p.city,
      p.country,
      p.rating || 4.5,
      p.moderationStatus || "PENDING"
    ]);
    import("@/utils/exportUtils").then(utils => {
      utils.exportToCSV("properties", headers, data);
      toast.success("CSV exported successfully!");
    });
  };

  const handleExportPDF = () => {
    const headers = ["Title", "Type", "City", "Country", "Rating", "Status"];
    const data = properties.map(p => [
      p.title,
      p.type,
      p.city,
      p.country,
      p.rating || 4.5,
      p.moderationStatus || "PENDING"
    ]);
    import("@/utils/exportUtils").then(utils => {
      utils.exportToPDF("properties", "Property Portfolio Report", headers, data);
      toast.success("PDF exported successfully!");
    });
  };

  const titleRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<"hotel" | "apartment" | "villa" | "resort">("hotel");
  const priceRef = useRef<HTMLInputElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const [amenityTimings, setAmenityTimings] = useState<Record<string, string>>({});

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get("/stays/owner/properties");
      const resData = response.data.data;
      setProperties(resData?.stays || (Array.isArray(resData) ? resData : []));
    } catch (error) {
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleEdit = (prop: any) => {
    setEditingProperty(prop);
    setType(prop.type);
    setPropertyImages(prop.images || []);
    setSelectedAmenities(prop.amenities || []);
    setAmenityHours(prop.policies?.amenityHours || {});
    setShowForm(true);
    // Use timeout to ensure refs are available after form render
    setTimeout(() => {
      if (latRef.current) latRef.current.value = prop.latitude?.toString() || "0";
      if (lngRef.current) lngRef.current.value = prop.longitude?.toString() || "0";
      if (checkInRef.current) checkInRef.current.value = prop.policies?.checkIn || "14:00";
      if (checkOutRef.current) checkOutRef.current.value = prop.policies?.checkOut || "11:00";
      setAmenityTimings(prop.policies?.amenityTimings || {});
    }, 0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      setIsUploading(true);
      const response = await api.post("/upload/multiple", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (response.data.success) {
        const newUrls = response.data.data.files.map((file: any) => file.fileUrl);
        setPropertyImages((prev) => [...prev, ...newUrls]);
        toast.success(`${files.length} images uploaded`);
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setPropertyImages(propertyImages.filter((_, i) => i !== index));
  };

  const addManualUrl = () => {
    if (!manualUrl.trim()) return;
    if (!manualUrl.match(/^https?:\/\/.+/)) {
      toast.error("Please enter a valid image URL");
      return;
    }
    setPropertyImages((prev) => [...prev, manualUrl]);
    setManualUrl("");
    toast.success("Image URL added");
  };

  const handleSave = async () => {
    const payload = {
      title: titleRef.current?.value || editingProperty?.title,
      description: descRef.current?.value || editingProperty?.description,
      type: type,
      city: cityRef.current?.value || editingProperty?.city,
      country: countryRef.current?.value || editingProperty?.country || "India",
      address: addressRef.current?.value || editingProperty?.address,
      latitude: parseFloat(latRef.current?.value || "0") || 0,
      longitude: parseFloat(lngRef.current?.value || "0") || 0,
      amenities: selectedAmenities,
      policies: {
        ...(editingProperty?.policies || {}),
        checkIn: checkInRef.current?.value || editingProperty?.policies?.checkIn || "14:00",
        checkOut: checkOutRef.current?.value || editingProperty?.policies?.checkOut || "11:00",
        amenityHours,
        amenityTimings
      },
      images: propertyImages.length > 0 ? propertyImages : ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"]
    };

    try {
      if (editingProperty) {
        await api.put(`/stays/${editingProperty.id}`, payload);
        toast.success("Property updated");
      } else {
        await api.post("/stays/owner/properties", payload);
        toast.success("Property listed successfully!");
      }
      setShowForm(false);
      setEditingProperty(null);
      setPropertyImages([]);
      setSelectedAmenities([]);
      setAmenityHours({});
      fetchProperties();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to save property";
      toast.error(msg);
      console.error("Save error:", error.response?.data);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will remove the property and all its rooms.")) return;
    try {
      await api.delete(`/stays/${id}`);
      toast.success("Property removed");
      fetchProperties();
    } catch (error) {
      toast.error("Failed to delete property");
    }
  };

  const handlePublishStay = async (stayId: string) => {
    try {
      await api.post(`/owner/stays/${stayId}/dev-approve`);
      toast.success("Property published! It will now appear in customer search.");
      fetchProperties();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to publish property");
    }
  };

  if (loading) {
    return <OwnerLayout><div className="h-[60vh] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div></OwnerLayout>;
  }

  return (
    <OwnerLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Property Portfolio</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your listings and viewing performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowForm(true)} className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4 mr-2" /> List New Property
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 mb-10 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-8 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Info className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">{editingProperty ? "Update Details" : "Property Information"}</h2>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setShowForm(false); setEditingProperty(null); }}><X className="h-5 w-5" /></Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Property Title</label>
              <Input ref={titleRef} defaultValue={editingProperty?.title} placeholder="e.g. Blue Lagoon Luxury Villa" className="h-12 border-slate-200" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Property Category</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as any)}
                className="flex h-12 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="hotel">Hotel</option>
                <option value="resort">Resort</option>
                <option value="villa">Villa</option>
                <option value="apartment">Apartment</option>
              </select>
            </div>
            <div className="space-y-2 col-span-full">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Physical Address</label>
              <Input ref={addressRef} defaultValue={editingProperty?.address} placeholder="Full street address" className="h-12 border-slate-200" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">City</label>
              <Input ref={cityRef} defaultValue={editingProperty?.city} placeholder="City name" className="h-12 border-slate-200" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Country</label>
              <Input ref={countryRef} defaultValue={editingProperty?.country || "India"} placeholder="Country name" className="h-12 border-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-4 col-span-full">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  Map Latitude <Info className="h-3 w-3 text-slate-400" />
                </label>
                <Input ref={latRef} type="number" step="any" defaultValue={editingProperty?.latitude || 0} placeholder="e.g. 15.5494" className="h-12 border-slate-200" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  Map Longitude <Info className="h-3 w-3 text-slate-400" />
                </label>
                <Input ref={lngRef} type="number" step="any" defaultValue={editingProperty?.longitude || 0} placeholder="e.g. 73.7535" className="h-12 border-slate-200" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium col-span-full">
                Use coordinates for precise map location. You can find these on Google Maps by right-clicking any spot.
              </p>
            </div>
            <div className="space-y-2 col-span-full">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Experience Description</label>
              <textarea ref={descRef} defaultValue={editingProperty?.description} className="w-full border border-slate-200 rounded-xl p-4 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="Describe the unique features of your property..." />
            </div>

            <div className="grid grid-cols-2 gap-4 col-span-full border-t pt-6 mt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  Check-In Time <Clock className="h-3 w-3 text-slate-400" />
                </label>
                <Input ref={checkInRef} type="time" defaultValue={editingProperty?.policies?.checkIn || "14:00"} className="h-12 border-slate-200" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  Check-Out Time <Clock className="h-3 w-3 text-slate-400" />
                </label>
                <Input ref={checkOutRef} type="time" defaultValue={editingProperty?.policies?.checkOut || "11:00"} className="h-12 border-slate-200" />
              </div>
            </div>

            <div className="col-span-full space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Amenities & Facilities ({selectedAmenities.length} selected)</label>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    value={amenitySearch}
                    onChange={(e) => setAmenitySearch(e.target.value)}
                    placeholder="Search amenities..." 
                    className="h-9 pl-9 text-xs rounded-full border-slate-200"
                  />
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                {AMENITY_CATEGORIES.map((category) => {
                  const filteredAmenities = category.amenities.filter(a => 
                    a.toLowerCase().includes(amenitySearch.toLowerCase())
                  );

                  if (filteredAmenities.length === 0) return null;

                  return (
                    <div key={category.title} className="space-y-3">
                      <h3 className="text-[11px] font-black text-primary uppercase tracking-wider bg-primary/5 px-3 py-1.5 rounded-lg inline-block">
                        {category.title}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredAmenities.map((amenity) => (
                          <div 
                            key={amenity} 
                            className={`flex items-center space-x-2 p-2 rounded-xl border transition-all cursor-pointer group ${
                              selectedAmenities.includes(amenity) 
                                ? "bg-primary/5 border-primary/20 shadow-sm" 
                                : "hover:bg-slate-50 border-transparent hover:border-slate-100"
                            }`}
                            onClick={() => {
                              if (selectedAmenities.includes(amenity)) {
                                setSelectedAmenities(prev => prev.filter(a => a !== amenity));
                              } else {
                                setSelectedAmenities(prev => [...prev, amenity]);
                              }
                            }}
                          >
                            <Checkbox 
                              checked={selectedAmenities.includes(amenity)}
                              className="rounded-md"
                            />
                            {(() => {
                              const Icon = getAmenityIcon(amenity);
                              return <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors flex-shrink-0" />;
                            })()}
                            <span className={`text-xs font-medium truncate ${
                              selectedAmenities.includes(amenity) ? "text-primary font-bold" : "text-slate-600"
                            }`}>
                              {amenity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedAmenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedAmenities.map(amenity => {
                    const Icon = getAmenityIcon(amenity);
                    return (
                      <Badge 
                        key={amenity} 
                        variant="secondary" 
                        className="bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer text-[10px] py-0.5 flex items-center gap-1.5"
                        onClick={() => setSelectedAmenities(prev => prev.filter(a => a !== amenity))}
                      >
                        <Icon className="h-3 w-3 text-slate-500" />
                        {amenity} <X className="h-2 w-2 ml-1" />
                      </Badge>
                    );
                  })}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] h-6 text-slate-400 hover:text-destructive"
                    onClick={() => setSelectedAmenities([])}
                  >
                    Clear All
                  </Button>
                </div>
              )}

              {selectedAmenities.filter(a => ["Pool", "Swimming Pool", "Gym", "Fitness Center", "Spa", "Restaurant", "Bar", "Lounge", "Breakfast"].some(key => a.includes(key))).length > 0 && (
                <div className="pt-6 border-t mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest">Operating Hours (24h format)</label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedAmenities.filter(a => ["Pool", "Swimming Pool", "Gym", "Fitness Center", "Spa", "Restaurant", "Bar", "Lounge", "Breakfast"].some(key => a.includes(key))).map(amenity => (
                      <div key={amenity} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{amenity}</label>
                        <Input 
                          placeholder="e.g. 06:00 - 22:00"
                          value={amenityTimings[amenity] || ""}
                          onChange={(e) => setAmenityTimings(prev => ({ ...prev, [amenity]: e.target.value }))}
                          className="h-9 bg-white border-slate-200 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Amenity Timings */}
            {selectedAmenities.filter(a => AMENITIES_WITH_HOURS.includes(a)).length > 0 && (
              <div className="col-span-full space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Facility Timings (24-Hour Format)</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedAmenities
                    .filter(a => AMENITIES_WITH_HOURS.includes(a))
                    .map((amenity) => (
                      <div key={amenity} className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{amenity}</label>
                        <Input
                          value={amenityHours[amenity] || ""}
                          onChange={(e) => setAmenityHours(prev => ({ ...prev, [amenity]: e.target.value }))}
                          placeholder="e.g. 08:00 - 22:00"
                          className="h-9 text-xs border-slate-200 bg-white"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="col-span-full space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Property Photos</label>
              
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 hover:border-primary/30 transition-all cursor-pointer relative" onClick={() => fileInputRef.current?.click()}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-bold text-slate-600 tracking-tight">Uploading images...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Click to upload property photos</p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">Add multiple images of your property</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Input 
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="Or paste an image URL manually..." 
                  className="h-12 border-slate-200"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addManualUrl}
                  className="h-12 px-6 rounded-xl border-slate-200 hover:bg-slate-50 font-bold"
                >
                  Add Link
                </Button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {propertyImages.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
                    <img src={url} alt={`Property ${idx + 1}`} className="w-full h-full object-cover shadow-inner" />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                      className="absolute top-2 right-2 bg-destructive/90 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl backdrop-blur-sm border border-white/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-full flex gap-3 pt-4">
              <Button onClick={handleSave} className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all">
                {editingProperty ? "Save Changes" : "Create Listing"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingProperty(null); }} className="px-8 h-12 rounded-xl text-slate-500 border-slate-200">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
          <LayoutGrid className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">No properties yet</h2>
          <p className="text-slate-500 mt-1 mb-6 max-w-xs mx-auto">Start by listing your first resort, villa or apartment to begin receiving bookings.</p>
          <Button onClick={() => setShowForm(true)} variant="outline" className="rounded-xl border-slate-300">Add Your First Property</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {properties.map((p) => (
            <div key={p.id} className="bg-white border border-slate-100 rounded-3xl overflow-hidden group hover:shadow-2xl transition-all duration-500">
              <div className="relative h-56">
                <img src={p.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg hover:bg-white transition-colors">
                        <MoreHorizontal className="h-5 w-5 text-slate-700" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl p-2 shadow-2xl border-slate-100 min-w-[160px]">
                      <DropdownMenuItem onClick={() => handleEdit(p)} className="rounded-xl py-2 cursor-pointer">
                        <Edit className="h-4 w-4 mr-3 text-slate-500" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/owner/rooms?stayId=${p.id}`)} className="rounded-xl py-2 cursor-pointer">
                        <Bed className="h-4 w-4 mr-3 text-slate-500" /> Manage Rooms
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem className="text-destructive rounded-xl py-2 cursor-pointer focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4 mr-3" /> Remove Listing
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="absolute bottom-4 left-4">
                  <span className="bg-primary/90 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg backdrop-blur-md">
                    {p.type}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{p.title}</h3>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ml-auto flex-shrink-0 ${
                    p.moderationStatus === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>{p.moderationStatus || "PENDING"}</span>
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1.5 mb-6">
                  <MapPin className="h-4 w-4 text-primary" /> {p.city}
                </p>
                <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="text-sm font-bold text-slate-900">{p.rating || 4.5}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.moderationStatus !== "APPROVED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 text-xs font-bold rounded-xl"
                        onClick={() => handlePublishStay(p.id)}
                      >
                        Publish ↑
                      </Button>
                    )}
                    <Button variant="ghost" className="text-primary font-bold text-sm hover:text-primary hover:bg-primary/5" onClick={() => navigate(`/owner/rooms?stayId=${p.id}`)}>
                      Rooms Detail →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerProperties;
;
