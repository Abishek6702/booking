/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User, Phone, Eye, EyeOff, AlertCircle, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[a-z]/, "Include a lowercase letter")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[0-9]/, "Include a number"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

const SectionLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <div className="w-8 h-[2px] bg-primary" />
    <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{text}</span>
  </div>
);

const Signup = () => {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await api.post("/auth/register", {
        name: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: "customer",
      });
      const result = response.data;
      if (!result.success) throw new Error(result.message || "Failed to create account");
      toast.success("Account created! Check your email for the OTP.");
      if (result.data?.verificationRequired) {
        navigate("/verify-otp", {
          state: {
            email: data.email,
            user: result.data.user,
            tokens: result.data.tokens,
          },
        });
      } else if (result.data?.tokens) {
        login(result.data.user, result.data.tokens);
        navigate("/");
      } else {
        navigate("/login");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "An error occurred during registration");
    }
  };

  return (
    <div className="min-h-screen flex bg-white selection:bg-primary selection:text-white">
      {/* Left Side - Video Effect */}
      <div className="hidden lg:block relative w-1/2 overflow-hidden bg-slate-900">
        <style>
          {`
            @keyframes slowPan {
              0% { transform: scale(1.1) translate(0, 0); }
              50% { transform: scale(1.1) translate(-2%, 1%); }
              100% { transform: scale(1.1) translate(0, 0); }
            }
            .animate-slow-pan {
              animation: slowPan 40s ease-in-out infinite;
            }
          `}
        </style>
        <div 
          className="absolute inset-0 bg-cover bg-center animate-slow-pan"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
        
        {/* Branding Overlay */}
        <div className="absolute bottom-16 left-16 right-16 z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <img src="/logo.png" alt="WAYNEXX Logo" className="h-8 w-auto object-contain mb-8 brightness-0 invert opacity-90 drop-shadow-md" />
          <h2 className="text-4xl font-black text-white tracking-tight mb-4 leading-tight drop-shadow-lg">Elevate Your<br/><span className="text-primary font-light italic font-serif">Journey</span></h2>
          <p className="text-white/80 font-medium text-lg drop-shadow">Curated stays, premium fleets, and exclusive experiences for the modern explorer.</p>
        </div>
      </div>

      {/* Right Side - Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white relative overflow-y-auto">
        <div className="w-full max-w-[450px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
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
          <div className="mb-6">
            <SectionLabel text="New Adventure" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
              Create <span className="text-primary italic font-light font-serif">Account</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">Start your journey with premium experiences.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="John Doe"
                    className={`h-10 pl-11 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium ${errors.fullName ? "border-red-400 bg-red-50/50" : ""}`}
                    {...register("fullName")}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-[10px] font-bold text-red-500 flex items-center gap-1.5 ml-1 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="h-3 w-3" /> {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile</label>
                <div className="relative group flex items-center">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400 select-none">+91</span>
                  <Input
                    placeholder="Number"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    className={`h-10 pl-20 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium ${errors.phone ? "border-red-400 bg-red-50/50" : ""}`}
                    {...register("phone")}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.value = el.value.replace(/\D/g, "").slice(0, 10);
                    }}
                  />
                </div>
                {errors.phone && (
                  <p className="text-[10px] font-bold text-red-500 flex items-center gap-1.5 ml-1 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="h-3 w-3" /> {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="name@example.com"
                  type="email"
                  className={`h-10 pl-11 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium ${errors.email ? "border-red-400 bg-red-50/50" : ""}`}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-[10px] font-bold text-red-500 flex items-center gap-1.5 ml-1 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-3 w-3" /> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="••••••••"
                  type={showPw ? "text" : "password"}
                  className={`h-10 pl-11 pr-12 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium ${errors.password ? "border-red-400 bg-red-50/50" : ""}`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] font-bold text-red-500 flex items-start gap-1.5 ml-1 animate-in fade-in slide-in-from-top-1 leading-tight">
                  <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" /> {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="••••••••"
                  type={showConfirm ? "text" : "password"}
                  className={`h-10 pl-11 pr-12 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium ${errors.confirmPassword ? "border-red-400 bg-red-50/50" : ""}`}
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[10px] font-bold text-red-500 flex items-center gap-1.5 ml-1 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-3 w-3" /> {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-2xl bg-slate-900 hover:bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </div>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
            <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline ml-1">Sign In</Link>
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

export default Signup;

