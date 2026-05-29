/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle, Clock, XCircle, Building2, ShieldCheck, FileText, ImageIcon, ArrowRight, Loader2, Zap, Compass, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";

const SectionLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <div className="w-8 h-[2px] bg-primary" />
    <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{text}</span>
  </div>
);

const OwnerVerification = () => {
  const [step, setStep] = useState<"form" | "pending" | "approved" | "rejected">("form");
  const [approving, setApproving] = useState(false);
  const navigate = useNavigate();

  const handleDevApprove = async () => {
    try {
      setApproving(true);
      await api.post("/owner/verification/dev-approve", {});
      toast.success("Owner verified! You can now list properties.");
      setStep("approved");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve — try again");
    } finally {
      setApproving(false);
    }
  };

  if (step !== "form") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50 px-4 py-12 relative overflow-hidden selection:bg-primary selection:text-white">
        {/* Background Elements */}
        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="w-full max-w-[450px] relative z-10">
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] p-8 md:p-10 text-center">
            {step === "pending" && (
              <>
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="h-10 w-10 text-amber-500 animate-pulse" />
                </div>
                <SectionLabel text="Verification" />
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Under <span className="text-amber-500 italic font-light font-serif">Review</span></h2>
                <p className="text-sm text-slate-500 font-medium mb-8">Our team is manually reviewing your documents. This typically takes 24 hours.</p>
                <div className="space-y-4">
                  <Button
                    onClick={handleDevApprove}
                    disabled={approving}
                    className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:shadow-primary/30 transition-all"
                  >
                    {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                    Approve Now (Dev Mode)
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/")} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary">Return to Home</Button>
                </div>
              </>
            )}
            {step === "approved" && (
              <>
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-emerald-500" />
                </div>
                <SectionLabel text="Success" />
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">You're <span className="text-emerald-500 italic font-light font-serif">Verified!</span></h2>
                <p className="text-sm text-slate-500 font-medium mb-8">Your account is now approved. Start listing properties and accepting bookings.</p>
                <Button onClick={() => navigate("/owner/properties")} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:shadow-primary/30 transition-all">
                  List Your First Property <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
            {step === "rejected" && (
              <>
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="h-10 w-10 text-rose-500" />
                </div>
                <SectionLabel text="Action Required" />
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Update <span className="text-rose-500 italic font-light font-serif">Needed</span></h2>
                <p className="text-sm text-slate-500 font-medium mb-8">There was an issue with your documents. Please resubmit a high-quality scan.</p>
                <Button onClick={() => setStep("form")} className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all">Resubmit Documents</Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 px-4 py-12 relative overflow-hidden selection:bg-primary selection:text-white">
      {/* Background Elements */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-[700px] relative z-10">
        {/* Back Link */}
        <button
          onClick={() => navigate("/")}
          className="group flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors mb-8"
        >
          <Compass className="h-3 w-3 group-hover:rotate-45 transition-transform duration-500" />
          Back to Explorer
        </button>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] p-8 md:p-12">
          {/* Header */}
          <div className="mb-10 text-center md:text-left">
            <SectionLabel text="Business Verification" />
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-4">
              Owner <span className="text-primary italic font-light font-serif">Validation</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium max-w-md">Verify your property ownership and business license to start hosting.</p>
          </div>

          {/* Dev-mode shortcut banner */}
          <div className="mb-10 bg-amber-50/50 backdrop-blur-md border border-amber-100 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-3 flex-1 text-center md:text-left">
              <Zap className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                <span className="text-amber-900">Dev Mode Enabled:</span> Skip upload and instantly approve.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleDevApprove}
              disabled={approving}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest h-9 px-6 shadow-lg shadow-amber-200"
            >
              {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Instant Approve"}
            </Button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); setStep("pending"); }} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resort Name</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input placeholder="Legal business name" className="h-12 pl-11 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Property Category</label>
                <select className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer">
                  <option>Luxury Resort</option>
                  <option>Private Villa</option>
                  <option>Boutique Hotel</option>
                  <option>Homestay</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Address</label>
              <Input placeholder="Full street address, City, Region" className="h-12 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                  <FileText className="h-3.5 w-3.5 text-primary/40" /> Business License
                </label>
                <div className="group border-2 border-dashed border-slate-100 rounded-[2rem] p-8 text-center hover:border-primary/30 transition-all cursor-pointer bg-slate-50/30 hover:bg-primary/5">
                  <Upload className="h-10 w-10 mx-auto text-slate-300 group-hover:text-primary transition-all mb-4" />
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Upload Scan</p>
                  <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">PDF, JPG (max 5MB)</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                  <ImageIcon className="h-3.5 w-3.5 text-primary/40" /> Identity Proof
                </label>
                <div className="group border-2 border-dashed border-slate-100 rounded-[2rem] p-8 text-center hover:border-primary/30 transition-all cursor-pointer bg-slate-50/30 hover:bg-primary/5">
                  <Upload className="h-10 w-10 mx-auto text-slate-300 group-hover:text-primary transition-all mb-4" />
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Upload ID Page</p>
                  <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Govt ID / Passport</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-2xl p-5 flex gap-4 border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                By submitting, you certify that you are the legal owner or authorized manager of this property and agree to the <span className="text-primary font-bold cursor-pointer hover:underline">Owner Terms of Service</span>.
              </p>
            </div>

            <Button type="submit" className="w-full h-16 rounded-[2rem] bg-slate-900 hover:bg-primary text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 active:scale-[0.98]">
              Submit for Approval <ArrowRight className="h-4 w-4 ml-3" />
            </Button>
          </form>

          {/* Footer Branding */}
          <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[9px] font-black uppercase tracking-widest">Enterprise Secure</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="h-4 w-4 text-primary/40" />
              <span className="text-[9px] font-black uppercase tracking-widest">Premium Partner</span>
            </div>
          </div>
        </div>

        {/* Brand tag below card */}
        <div className="text-center mt-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
            WAYNEXX <span className="text-primary/40">·</span> Luxury Redefined
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerVerification;

