/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail, Lock, User, Phone, Building2, Eye, EyeOff,
  FileText, Shield, CheckCircle2, Upload, X, ChevronRight, ChevronLeft,
  Compass, ShieldCheck, Sparkles, AlertCircle
} from "lucide-react";

const SectionLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <div className="w-8 h-[2px] bg-primary" />
    <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{text}</span>
  </div>
);
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

// ── Schemas ─────────────────────────────────────────────────────────────────
const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number"),
});
type Step1Data = z.infer<typeof step1Schema>;

// ── Doc upload types ──────────────────────────────────────────────────────────
type DocKey =
  | "businessLicense"
  | "tourismRegistration"
  | "gstCertificate"
  | "propertyOwnershipProof"
  | "governmentId"
  | "aadhaarCard"
  | "panCard";

interface DocFile {
  file: File;
  previewUrl: string;
}

const BUSINESS_DOCS: { key: DocKey; label: string; hint: string; required: boolean }[] = [
  { key: "businessLicense",       label: "Business License",          hint: "Trade / shop establishment certificate", required: true  },
  { key: "tourismRegistration",   label: "Tourism Registration",       hint: "Dept. of Tourism registration certificate",required: true  },
  { key: "gstCertificate",        label: "GST Certificate",            hint: "GSTIN registration document",            required: false },
  { key: "propertyOwnershipProof",label: "Property Ownership Proof",   hint: "Sale deed / lease agreement / title deed", required: true  },
];

const GOVT_DOCS: { key: DocKey; label: string; hint: string; required: boolean }[] = [
  { key: "governmentId", label: "Government ID Proof", hint: "Passport / Voter ID / Driving License", required: true  },
  { key: "aadhaarCard",  label: "Aadhaar Card",        hint: "Front & back scan of Aadhaar",          required: true  },
  { key: "panCard",      label: "PAN Card",             hint: "Permanent Account Number card",         required: true  },
];

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Account Info",       icon: User      },
  { label: "Business Documents", icon: FileText  },
  { label: "Government IDs",     icon: Shield    },
];

// ── File upload widget ────────────────────────────────────────────────────────
function DocUpload({
  docKey, label, hint, required, value, onChange,
}: {
  docKey: DocKey; label: string; hint: string; required: boolean;
  value: DocFile | null; onChange: (key: DocKey, val: DocFile | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error(`${label}: file must be under 5 MB`); return; }
    onChange(docKey, { file: f, previewUrl: URL.createObjectURL(f) });
  };

  const isImage = value?.file.type.startsWith("image/");

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {label} {required && <span className="text-destructive">*</span>}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(docKey, null); if (ref.current) ref.current.value = ""; }}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {value ? (
        <div className="flex items-center gap-3 bg-primary/10 rounded-lg p-2">
          {isImage ? (
            <img src={value.previewUrl} alt="preview" className="h-12 w-12 object-cover rounded" />
          ) : (
            <div className="h-12 w-12 flex items-center justify-center bg-primary/20 rounded">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{value.file.name}</p>
            <p className="text-xs text-muted-foreground">{(value.file.size / 1024).toFixed(0)} KB</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full border-2 border-dashed border-border hover:border-primary rounded-lg py-4 flex flex-col items-center gap-1 transition-colors group"
        >
          <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
            Click to upload — PDF, JPG, PNG (max 5 MB)
          </span>
        </button>
      )}

      <input ref={ref} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFile} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const OwnerSignup = () => {
  const [step, setStep]       = useState(0);
  const [showPw, setShowPw]   = useState(false);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [docs, setDocs]       = useState<Partial<Record<DocKey, DocFile | null>>>({});
  const [submitting, setSubmitting] = useState(false);
  const navigate              = useNavigate();
  const { login }             = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  });

  const setDoc = (key: DocKey, val: DocFile | null) =>
    setDocs(prev => ({ ...prev, [key]: val }));

  // ── Validate docs for a group ───────────────────────────────────────────────
  const validateDocs = (group: typeof BUSINESS_DOCS) => {
    for (const d of group) {
      if (d.required && !docs[d.key]) {
        toast.error(`Please upload: ${d.label}`);
        return false;
      }
    }
    return true;
  };

  // ── Step 1 submit ───────────────────────────────────────────────────────────
  const onStep1 = (data: Step1Data) => {
    setStep1Data(data);
    setStep(1);
  };

  // ── Step 2 → 3 ─────────────────────────────────────────────────────────────
  const onStep2 = () => {
    if (!validateDocs(BUSINESS_DOCS)) return;
    setStep(2);
  };

  // ── Final submit ────────────────────────────────────────────────────────────
  const onFinalSubmit = async () => {
    if (!validateDocs(GOVT_DOCS)) return;
    if (!step1Data) return;

    setSubmitting(true);
    try {
      // Build multipart form data (docs as files)
      const formData = new FormData();
      formData.append("name",     step1Data.name);
      formData.append("email",    step1Data.email);
      formData.append("password", step1Data.password);
      formData.append("role",     "owner");
      if (step1Data.phone) formData.append("phone", step1Data.phone);

      // Attach document files
      const allDocs = [...BUSINESS_DOCS, ...GOVT_DOCS];
      for (const d of allDocs) {
        const docFile = docs[d.key];
        if (docFile?.file) formData.append(d.key, docFile.file, docFile.file.name);
      }

      const response = await api.post("/auth/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!response.data.success) throw new Error(response.data.message || "Registration failed");

      const { user, tokens } = response.data.data;
      login(user, tokens);

      toast.success("Account created! Your documents are under review.");
      navigate("/owner/pending");
    } catch (error: any) {
      // Backend may not support multipart yet — fall back to JSON without docs
      if (error.response?.status === 415 || error.response?.status === 400) {
        try {
          const jsonPayload: Record<string, string> = {
            name:     step1Data.name,
            email:    step1Data.email,
            password: step1Data.password,
            role:     "owner",
          };
          // Only include phone if non-empty (backend requires min 7 chars)
          if (step1Data.phone && step1Data.phone.trim().length > 0) {
            jsonPayload.phone = step1Data.phone;
          }
          const response = await api.post("/auth/register", jsonPayload);
          if (!response.data.success) throw new Error(response.data.message || "Registration failed");
          const { user, tokens } = response.data.data;
          login(user, tokens);
          toast.success("Account created! Your documents are under review.");
          navigate("/owner/pending");
          return;
        } catch (innerErr: any) {
          toast.error(innerErr.response?.data?.message || innerErr.message || "Registration failed");
          return;
        }
      }
      toast.error(error.response?.data?.message || error.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── UI helpers ──────────────────────────────────────────────────────────────
  const completedDocs = (group: typeof BUSINESS_DOCS) =>
    group.filter(d => docs[d.key]).length;

  return (
    <div className="min-h-screen flex bg-white selection:bg-primary selection:text-white">
      {/* Left Side - Video Effect */}
      <div className="hidden lg:block relative w-1/2 overflow-hidden bg-slate-900">
        <style>
          {`
            @keyframes slowPan {
              0% { transform: scale(1.1) translate(0, 0); }
              50% { transform: scale(1.1) translate(2%, -1%); }
              100% { transform: scale(1.1) translate(0, 0); }
            }
            .animate-slow-pan {
              animation: slowPan 40s ease-in-out infinite;
            }
          `}
        </style>
        <div 
          className="absolute inset-0 bg-cover bg-center animate-slow-pan"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
        
        {/* Branding Overlay */}
        <div className="absolute bottom-16 left-16 right-16 z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <img src="/logo.png" alt="WAYNEXX Logo" className="h-8 w-auto object-contain mb-8 brightness-0 invert opacity-90 drop-shadow-md" />
          <h2 className="text-4xl font-black text-white tracking-tight mb-4 leading-tight drop-shadow-lg">Elevate Your<br/><span className="text-primary font-light italic font-serif">Properties</span></h2>
          <p className="text-white/80 font-medium text-lg drop-shadow">Manage your premium portfolio and offer exclusive experiences to modern explorers.</p>
        </div>
      </div>

      {/* Right Side - Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white relative overflow-y-auto">
        <div className="w-full max-w-[500px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Back Link */}
        <button
          onClick={() => navigate("/")}
          className="group flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors mb-8"
        >
          <Compass className="h-3 w-3 group-hover:rotate-45 transition-transform duration-500" />
          Back to Explorer
        </button>

        {/* Card Replacement */}
        <div className="bg-transparent p-0">

          {/* Header */}
          <div className="mb-8">
            <SectionLabel text="Owner Portal" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
              Partner <span className="text-primary italic font-light font-serif">Registration</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">List your property on WAYNEXX.</p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-0 mb-8">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                      done   ? "bg-slate-900 border-slate-900 text-white" :
                      active ? "bg-primary/10 border-primary text-primary" :
                               "bg-slate-50 border-slate-200 text-slate-400"
                    }`}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${active ? "text-primary" : "text-slate-400"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 w-12 sm:w-16 mb-4 mx-1 transition-all ${i < step ? "bg-slate-900" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── STEP 0: Account Info ── */}
          {step === 0 && (
            <form onSubmit={handleSubmit(onStep1)} className="space-y-4 animate-fade-in">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input id="owner-name" placeholder="Full Name" className={`h-12 pl-11 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium ${errors.name ? "border-red-400 bg-red-50/50" : ""}`} {...register("name")} />
                </div>
                {errors.name && <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1 flex items-center gap-1.5"><AlertCircle className="h-3 w-3" /> {errors.name.message}</p>}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input id="owner-email" placeholder="Email address" className={`h-12 pl-11 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium ${errors.email ? "border-red-400 bg-red-50/50" : ""}`} type="email" {...register("email")} />
                </div>
                {errors.email && <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1 flex items-center gap-1.5"><AlertCircle className="h-3 w-3" /> {errors.email.message}</p>}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="owner-phone"
                    placeholder="Phone Number (10 digits)"
                    className={`h-12 pl-11 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium ${errors.phone ? "border-red-400 bg-red-50/50" : ""}`}
                    type="tel" inputMode="numeric" maxLength={10}
                    {...register("phone")}
                    onInput={(e) => {
                      const input = e.currentTarget;
                      input.value = input.value.replace(/\D/g, "").slice(0, 10);
                    }}
                  />
                </div>
                {errors.phone && <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1 flex items-center gap-1.5"><AlertCircle className="h-3 w-3" /> {errors.phone.message}</p>}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="owner-password"
                    placeholder="Password"
                    className={`h-12 pl-11 pr-12 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium ${errors.password ? "border-red-400 bg-red-50/50" : ""}`}
                    type={showPw ? "text" : "password"}
                    {...register("password")}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1 flex items-center gap-1.5"><AlertCircle className="h-3 w-3" /> {errors.password.message}</p>}
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:shadow-primary/30 transition-all duration-300">
                  Continue <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          )}

          {/* ── STEP 1: Business Documents ── */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Business Documents</h2>
                <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-3 py-1 rounded-full">
                  {completedDocs(BUSINESS_DOCS)} / {BUSINESS_DOCS.length} uploaded
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4 font-medium">
                Upload official documents to verify your business credentials.
              </p>

              {BUSINESS_DOCS.map(d => (
                <DocUpload
                  key={d.key}
                  docKey={d.key}
                  label={d.label}
                  hint={d.hint}
                  required={d.required}
                  value={docs[d.key] ?? null}
                  onChange={setDoc}
                />
              ))}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-widest" onClick={() => setStep(0)}>
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:shadow-primary/30 transition-all" onClick={onStep2}>
                  Continue <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Government ID ── */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Government ID Proof</h2>
                <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-3 py-1 rounded-full">
                  {completedDocs(GOVT_DOCS)} / {GOVT_DOCS.length} uploaded
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4 font-medium">
                Provide valid government-issued identification documents.
              </p>

              {GOVT_DOCS.map(d => (
                <DocUpload
                  key={d.key}
                  docKey={d.key}
                  label={d.label}
                  hint={d.hint}
                  required={d.required}
                  value={docs[d.key] ?? null}
                  onChange={setDoc}
                />
              ))}

              {/* disclaimer */}
              <p className="text-[10px] font-bold text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 mt-4 leading-relaxed">
                🔒 Your documents are encrypted and used solely for KYC verification. They will not be shared with third parties.
              </p>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-widest" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:shadow-primary/30 transition-all"
                  onClick={onFinalSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Creating…" : "Create Account"}
                </Button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-slate-100 space-y-6">
            <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Already registered?{" "}
              <Link to="/owner/login" className="text-primary hover:underline ml-1">Sign In</Link>
            </p>

            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">Secure</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Sparkles className="h-4 w-4 text-primary/40" />
                <span className="text-[9px] font-black uppercase tracking-widest">Premium</span>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};

export default OwnerSignup;
