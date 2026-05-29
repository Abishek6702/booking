/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Compass, ShieldCheck, Sparkles, KeyRound, Mail, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const SectionLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <div className="w-8 h-[2px] bg-primary" />
    <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{text}</span>
  </div>
);

const OtpVerification = () => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const email = location.state?.email;
  const pendingUser = location.state?.user;
  const pendingTokens = location.state?.tokens;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.trim();
    setError("");

    if (token.length !== 6) {
      setError("Enter the 6-digit OTP sent to your email");
      toast.error("Enter the 6-digit OTP sent to your email");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/verify-email", {
        token,
      });
      if (response.data.success) {
        const verifiedUser = response.data.data?.user ?? pendingUser;
        const tokens = response.data.data?.tokens ?? pendingTokens;

        if (verifiedUser && tokens) {
          login({ ...verifiedUser, isVerified: true }, tokens);
          toast.success("Email verified! Welcome to your account.");
          navigate("/dashboard", { replace: true });
          return;
        }

        toast.success("Email verified! Please sign in to continue.");
        navigate("/login", { replace: true });
      } else {
        const message = response.data.message || "Wrong code. Re-enter it.";
        setError(message);
        toast.error(message);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Wrong code. Re-enter it.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 px-4 py-12 relative overflow-hidden selection:bg-primary selection:text-white">
      {/* Background Elements */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Back Link */}
        <button
          onClick={() => navigate("/login")}
          className="group flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors mb-8"
        >
          <Compass className="h-3 w-3 group-hover:rotate-45 transition-transform duration-500" />
          Back to Login
        </button>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] p-8 md:p-10">
          {/* Header */}
          <div className="mb-8">
            <SectionLabel text="Verification" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
              Verify <span className="text-primary italic font-light font-serif">Email</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Enter the OTP sent to <span className="text-slate-900 font-bold">{email || "your email"}</span>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2 text-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">6-Digit Verification Code</label>
              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  className="h-14 pl-11 rounded-2xl bg-white border-slate-200 focus:ring-primary/20 focus:border-primary transition-all text-xl font-mono tracking-[0.5em] text-center"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                "Verify Account"
              )}
            </Button>
          </form>

          {/* Dev Mode Tool */}
          {process.env.NODE_ENV !== "production" && (
            <div className="mt-8 pt-8 border-t border-dashed border-slate-200">
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl border-primary/20 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all"
                onClick={async () => {
                  try {
                    const res = await api.post("/auth/dev-approve");
                    if (res.data.success) {
                      login({ ...pendingUser, isVerified: true }, pendingTokens);
                      toast.success("Dev: Email approved!");
                      navigate("/dashboard", { replace: true });
                    }
                  } catch (err: any) {
                    toast.error("Dev Approve failed: " + (err.response?.data?.message || err.message));
                  }
                }}
              >
                Quick Approve (Dev Mode)
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-slate-100 space-y-6 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Didn't receive the code?{" "}
              <button className="text-primary hover:underline ml-1">Resend OTP</button>
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

        {/* Brand tag below card */}
        <div className="text-center mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
            WAYNEXX <span className="text-primary/40">·</span> Luxury Redefined
          </p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;

