/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Compass, ShieldCheck, Sparkles, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

type Step = "email" | "code" | "password";

const SectionLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <div className="w-8 h-[2px] bg-primary" />
    <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{text}</span>
  </div>
);

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Request reset code
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/auth/forgot-password", { email });
      
      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to send reset code");
      }

      toast.success("Reset code sent to your email. It will expire in 15 minutes.");
      setStep("code");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to send reset code";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify code
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Reset code must be 6 digits");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/auth/verify-reset-code", {
        email,
        code,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to verify reset code");
      }

      toast.success("Reset code verified. Create your new password.");
      setStep("password");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to verify code";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");

    if (!email) {
      setError("Enter your email first to resend the code");
      return;
    }

    setIsResending(true);

    try {
      const response = await api.post("/auth/forgot-password", { email });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to resend reset code");
      }

      setCode("");
      toast.success("A new reset code has been sent to your email.");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to resend reset code";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsResending(false);
    }
  };

  // Step 3: Reset password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Password strength validation
    if (!/[a-z]/.test(password)) {
      setError("Password must include a lowercase letter");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Password must include an uppercase letter");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Password must include a number");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/auth/reset-password", {
        email,
        code,
        password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to reset password");
      }

      toast.success("Password reset successfully!");
      navigate("/login");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to reset password";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
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
              50% { transform: scale(1.15); }
              100% { transform: scale(1); }
            }
            .animate-slow-zoom {
              animation: slowZoom 35s ease-in-out infinite;
            }
          `}
        </style>
        <div 
          className="absolute inset-0 bg-cover bg-center animate-slow-zoom"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=2068&auto=format&fit=crop')" }}
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white relative overflow-y-auto">
        <div className="w-full max-w-[400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Back Link */}
        <button
          onClick={() => navigate("/login")}
          className="group flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors mb-8"
        >
          <Compass className="h-3 w-3 group-hover:rotate-45 transition-transform duration-500" />
          Back to Login
        </button>

        {/* Card Replacement */}
        <div className="bg-transparent p-0">
          {/* Header */}
          <div className="mb-8">
            <SectionLabel text="Account Security" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
              Reset <span className="text-primary italic font-light font-serif">Password</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {step === "email" && "Enter your email to receive a reset code"}
              {step === "code" && "Enter the 6-digit code we sent"}
              {step === "password" && "Create your new password"}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-2 mb-8">
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step === "email" || step === "code" || step === "password" ? "bg-primary" : "bg-slate-100"}`} />
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step === "code" || step === "password" ? "bg-primary" : "bg-slate-100"}`} />
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step === "password" ? "bg-primary" : "bg-slate-100"}`} />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider leading-relaxed">{error}</p>
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="name@example.com"
                    type="email"
                    className="h-12 pl-11 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  "Send Reset Code"
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Code */}
          {step === "code" && (
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <div className="space-y-2 text-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">6-Digit Reset Code</label>
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="000000"
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    className="h-14 pl-11 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-xl font-mono tracking-[0.5em] text-center"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-400">
                  Sent to <span className="text-slate-900 font-bold">{email}</span>
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading || code.length !== 6}
                  className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Verify Code"
                  )}
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendCode}
                    disabled={isLoading || isResending}
                    className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    {isResending ? "Resending..." : "Resend Code"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("email")}
                    className="flex-1 h-12 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Change Email
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Step 3: Password */}
          {step === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      className="h-12 pl-11 pr-12 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      className="h-12 pl-11 pr-12 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3 text-primary/60" /> Password Requirements
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { label: "8+ Characters", met: password.length >= 8 },
                    { label: "Uppercase & Lowercase", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
                    { label: "Includes Number", met: /[0-9]/.test(password) },
                  ].map((req, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-1 h-1 rounded-full ${req.met ? "bg-teal" : "bg-slate-300"}`} />
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${req.met ? "text-teal-600" : "text-slate-400"}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Resetting...</span>
                  </div>
                ) : (
                  "Complete Password Reset"
                )}
              </Button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-slate-100">
            <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Back to safe travels?{" "}
              <Link to="/login" className="text-primary hover:underline ml-1">Sign In</Link>
            </p>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};



export default ForgotPassword;

