import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, User, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  setupCode: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface LoginProps {
  mode?: "login" | "register";
}

const Login = ({ mode = "login" }: LoginProps) => {
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const isRegister = mode === "register";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (isRegister && !data.name?.trim()) {
        throw new Error("Name is required");
      }

      const response = isRegister
        ? await api.post("/auth/admin/register", {
            name: data.name?.trim(),
            email: data.email,
            password: data.password,
            setupCode: data.setupCode?.trim() || undefined,
          })
        : await api.post("/auth/login", {
            email: data.email,
            password: data.password,
          });

      const result = response.data;
      if (!result.success) throw new Error(result.message || "Login failed");

      const { user: serverUser, tokens } = result.data;

      if (serverUser.role !== "ADMIN") {
        throw new Error("Access denied. This portal is for administrators only.");
      }

      login(serverUser, tokens);
      toast.success(isRegister ? "Admin account created" : "Welcome, Admin!");
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || (isRegister ? "Registration failed" : "Invalid credentials"));
    }
  };

  return (
    <div className="min-h-screen flex bg-white selection:bg-violet-500 selection:text-white">
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
              animation: slowZoom 35s ease-in-out infinite;
            }
          `}
        </style>
        <div 
          className="absolute inset-0 bg-cover bg-center animate-slow-zoom"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
        
        {/* Branding Overlay */}
        <div className="absolute bottom-16 left-16 right-16 z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <img src="/logo.png" alt="WAYNEXX Logo" className="h-8 w-auto object-contain mb-8 brightness-0 invert opacity-90 drop-shadow-md" />
          <h2 className="text-4xl font-black text-white tracking-tight mb-4 leading-tight drop-shadow-lg">Command<br/><span className="text-violet-400 font-light italic font-serif">Center</span></h2>
          <p className="text-white/80 font-medium text-lg drop-shadow">Manage platform operations, oversee user access, and maintain the premium WAYNEXX standard.</p>
        </div>
      </div>

      {/* Right Side - Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white relative overflow-y-auto">
        <div className="w-full max-w-[400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-[2px] bg-violet-500" />
              <span className="text-[9px] font-black text-violet-500 uppercase tracking-[0.3em]">System Admin</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
              Secure <span className="text-violet-500 italic font-light font-serif">Access</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">WAYNEXX Platform Administration</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Admin name"
                    className={`h-10 pl-10 rounded-xl bg-white border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium ${errors.name ? "border-rose-400" : ""}`}
                    {...register("name")}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-violet-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> {errors.name.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="admin@example.com"
                  className={`h-10 pl-10 rounded-xl bg-white border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium ${errors.email ? "border-rose-400" : ""}`}
                  type="email"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-violet-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="••••••••"
                  className={`h-10 pl-10 pr-10 rounded-xl bg-white border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium ${errors.password ? "border-rose-400" : ""}`}
                  type={showPw ? "text" : "password"}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-violet-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {errors.password.message}
                </p>
              )}
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Setup Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Required after first admin"
                    className="h-10 pl-10 rounded-xl bg-white border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium"
                    {...register("setupCode")}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] mt-2"
            >
              {isSubmitting
                ? isRegister ? "Creating account..." : "Verifying..."
                : isRegister ? "Create Admin Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              {isRegister ? "Already have admin access?" : "Need admin access?"}{" "}
              <Link to={isRegister ? "/login" : "/register"} className="text-violet-500 hover:text-violet-600 hover:underline ml-1">
                {isRegister ? "Sign in" : "Register"}
              </Link>
            </p>
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-4">Restricted to Platform Administrators</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
