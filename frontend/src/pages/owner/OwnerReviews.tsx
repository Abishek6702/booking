/* eslint-disable @typescript-eslint/no-explicit-any */
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, Search, Send, Bell, Mail, Phone, Calendar, Loader2, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";

const OwnerReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [search, setSearch] = useState("");

  const handleExportCSV = () => {
    const headers = ["Guest", "Rating", "Property", "Comment", "Date", "Reply"];
    const data = reviews.map(r => [
      r.guest?.name || "Guest",
      r.rating,
      r.stayTitle || "",
      r.comment || "",
      new Date(r.createdAt).toLocaleDateString(),
      r.ownerReply || ""
    ]);
    import("@/utils/exportUtils").then(utils => {
      utils.exportToCSV("reviews", headers, data);
      toast.success("CSV exported successfully!");
    });
  };

  const handleExportPDF = () => {
    const headers = ["Guest", "Rating", "Property", "Date"];
    const data = reviews.map(r => [
      r.guest?.name || "Guest",
      r.rating.toString(),
      r.stayTitle || "",
      new Date(r.createdAt).toLocaleDateString()
    ]);
    import("@/utils/exportUtils").then(utils => {
      utils.exportToPDF("reviews", "Guest Feedback Report", headers, data);
      toast.success("PDF exported successfully!");
    });
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get("/owner/reviews");
      // API returns a pagination object: { page, limit, total, totalPages, reviews: [] }
      setReviews(res.data.data?.reviews || []);
    } catch (error: any) {
      console.error("Failed to load reviews:", error?.response?.data || error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filtered = reviews.filter(r =>
    search === "" ||
    (r.guest?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.comment || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.stayTitle || "").toLowerCase().includes(search.toLowerCase())
  );

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) ratingCounts[r.rating]++;
  });

  return (
    <OwnerLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Guest Reviews</h1>
          <p className="text-sm text-slate-500 mt-1">Manage feedback, reply to guests, and monitor your property's reputation.</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" className="relative" onClick={() => toast.info("Notifications are up to date.")}>
            <Bell className="h-4 w-4 mr-2" /> 
            Notifications 
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Stats & Filters (Left) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sentiment Overview</h2>
            <div className="flex flex-col items-center py-4">
              <span className="text-5xl font-black text-slate-900">{avgRating.toFixed(1)}</span>
              <div className="flex gap-0.5 my-2">
                {[1,2,3,4,5].map(i => <Star key={i} className={`h-4 w-4 ${i <= Math.round(avgRating) ? "fill-accent text-accent" : "text-slate-200"}`} />)}
              </div>
              <span className="text-xs font-bold text-slate-500">Based on {reviews.length} reviews</span>
            </div>
            <div className="space-y-3 mt-4 border-t border-slate-50 pt-6">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingCounts[stars] || 0;
                const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                return (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-600 w-4">{stars}</span>
                    <Star className="h-3 w-3 fill-slate-300 text-slate-300" />
                    <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 w-8">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Request Feedback</h2>
            <p className="text-xs text-slate-500 mb-4">Ask guests who recently checked out to leave a review.</p>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-xs h-9" onClick={() => toast.success("Email review request sent to recent guests!")}>
                 <Mail className="h-3.5 w-3.5 mr-2 text-primary" /> Send Email Request
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-9" onClick={() => toast.success("WhatsApp link sent to recent guests!")}>
                 <Phone className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Send WhatsApp Link
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews Feed (Right) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white border border-slate-200 rounded-2xl p-3 px-4 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search reviews by guest name or keywords..."
                className="pl-10 h-10 border-0 bg-transparent focus-visible:ring-0 shadow-none text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-500">
                    {reviews.length === 0 ? "No reviews yet — they'll appear here once guests submit feedback." : "No reviews match your search"}
                  </p>
                </div>
              ) : filtered.map((r) => (
                <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-primary font-bold text-lg border border-slate-100 uppercase">
                        {(r.guest?.name || "G").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{r.guest?.name || "Guest"}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex">
                            {[1,2,3,4,5].map(i => <Star key={i} className={`h-3 w-3 ${i <= r.rating ? "fill-accent text-accent" : "text-slate-200"}`} />)}
                          </div>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" /> {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900">{r.stayTitle}</p>
                      {r.roomName && <p className="text-[10px] text-slate-400 mt-0.5">{r.roomName}</p>}
                    </div>
                  </div>

                  {r.title && (
                    <p className="text-sm font-bold text-slate-800 mt-4">{r.title}</p>
                  )}

                  <p className="text-sm text-slate-700 mt-3 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 italic">
                    "{r.comment}"
                  </p>

                  {r.ownerReply && (
                    <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-xl animate-in fade-in slide-in-from-top-1">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" /> Your Response
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed italic">"{r.ownerReply}"</p>
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-xs text-slate-400">Rating: {r.rating}/5</span>
                    {replyingTo !== r.id ? (
                      <Button onClick={() => {
                        setReplyingTo(r.id);
                        setReplyText(r.ownerReply || "");
                      }} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/10 flex items-center gap-2 text-xs py-5">
                        <MessageSquare className="h-3.5 w-3.5" /> {r.ownerReply ? "Edit Reply" : "Reply to Guest"}
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }} className="text-xs text-slate-400">Cancel</Button>
                    )}
                  </div>

                  {replyingTo === r.id && (
                    <div className="mt-4 animate-in slide-in-from-top-2">
                      <div className="relative">
                        <textarea
                          className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm bg-slate-50 focus:bg-white focus:border-primary/50 outline-none transition-all resize-none min-h-[120px]"
                          placeholder="Type your professional response here..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-medium">{replyText.length} characters</span>
                          <Button 
                            onClick={async () => {
                              if (!replyText.trim()) { toast.error("Reply cannot be empty."); return; }
                              try {
                                const res = await api.post(`/owner/reviews/${r.id}/reply`, {
                                  reply: replyText,
                                });
                                if (res.data.success) {
                                  toast.success("Reply submitted successfully!");
                                  setReplyingTo(null);
                                  setReplyText("");
                                  fetchReviews();
                                }
                              } catch (error: any) {
                                toast.error(error.response?.data?.message || "Failed to submit reply");
                              }
                            }} 
                            className="h-9 w-9 p-0 bg-primary text-white rounded-lg shadow-lg shadow-primary/20"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </OwnerLayout>
  );
};

export default OwnerReviews;
