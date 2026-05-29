/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

const SectionLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <div className="w-8 h-[2px] bg-primary" />
    <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{text}</span>
  </div>
);

const Login = () => {
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = (location.state as { from?: string })?.from ?? "/";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await api.post("/auth/login", { email: data.email, password: data.password });
      const result = response.data;
      if (!result.success) throw new Error(result.message || "Failed to sign in");
      const { user: serverUser, tokens } = result.data;
      toast.success("Welcome back!");
      login(serverUser, tokens);
      if (serverUser.role === "ADMIN") navigate("/admin/dashboard", { replace: true });
      else if (serverUser.role === "OWNER") navigate("/owner/dashboard", { replace: true });
      else navigate(from, { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex bg-white selection:bg-primary selection:text-white">
      {/* Left Side - Video Effect */}
      <div className="hidden lg:block relative w-1/2 overflow-hidden bg-slate-900">
        <style>
          {`
            @keyframes slowZoom {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            .animate-slow-zoom {
              animation: slowZoom 30s ease-in-out infinite;
            }
          `}
        </style>
        <div 
          className="absolute inset-0 bg-cover bg-center animate-slow-zoom"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop')" }}
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
        <div className="w-full max-w-[400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
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
            <SectionLabel text="Welcome Back" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
              Customer <span className="text-primary italic font-light font-serif">Login</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">Sign in to manage your premium journeys.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                <Link to="/forgot-password" size="sm" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                  Forgot?
                </Link>
              </div>
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
                <p className="text-[10px] font-bold text-red-500 flex items-center gap-1.5 ml-1 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-3 w-3" /> {errors.password.message}
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
                  <span>Verifying...</span>
                </div>
              ) : (
                "Sign In to Account"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
            <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              New to WAYNEXX?{" "}
              <Link to="/signup" className="text-primary hover:underline ml-1">Create Account</Link>
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

            <div className="bg-slate-50 rounded-2xl p-4 text-center group cursor-pointer hover:bg-primary/5 transition-colors duration-300">
              <Link to="/owner/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors flex items-center justify-center gap-2">
                Property Host Portal <Compass className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
