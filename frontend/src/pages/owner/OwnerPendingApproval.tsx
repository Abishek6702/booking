import { Clock, Building2, CheckCircle2, FileText, Shield, Mail, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

const STEPS = [
  { icon: FileText,     label: "Documents submitted",    done: true  },
  { icon: Clock,        label: "Admin review in progress",done: false },
  { icon: CheckCircle2, label: "Account activated",       done: false },
];

const OwnerPendingApproval = () => {
  const { user, logout, isOwnerApproved } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  // If somehow they land here already approved, push to dashboard
  if (isOwnerApproved) {
    navigate("/owner/dashboard", { replace: true });
    return null;
  }

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const res = await api.get("/auth/me");
      if (res.data.success) {
        const { ownerStatus } = res.data.data.user;
        if (ownerStatus === "APPROVED") {
          toast.success("Your account has been approved! Welcome aboard.");
          // Page will redirect via ProtectedRoute after re-hydration
          window.location.href = "/owner/dashboard";
        } else if (ownerStatus === "REJECTED") {
          toast.error("Your application was rejected. Please contact support.");
        } else {
          toast.info("Still under review. We'll notify you by email.");
        }
      }
    } catch {
      toast.error("Could not check status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/owner/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Building2 className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-primary">Resort Owner Portal</span>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8 text-center">

          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
            <Clock className="h-10 w-10 text-amber-500 animate-pulse" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">Pending Admin Approval</h1>
          <p className="text-sm text-muted-foreground mb-6 px-2">
            Hi <span className="font-semibold text-foreground">{user?.name ?? "there"}</span>! Your registration and documents
            have been received. Our team is reviewing your application — this usually takes <strong>24–48 hours</strong>.
          </p>

          {/* Progress steps */}
          <div className="space-y-3 mb-8 text-left">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${
                  s.done
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : i === 1
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : "bg-muted/30 border-border"
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    s.done
                      ? "bg-green-500"
                      : i === 1
                      ? "bg-amber-400"
                      : "bg-muted"
                  }`}>
                    <Icon className={`h-4 w-4 ${s.done || i === 1 ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      s.done ? "text-green-700 dark:text-green-400" :
                      i === 1 ? "text-amber-700 dark:text-amber-400" :
                      "text-muted-foreground"
                    }`}>{s.label}</p>
                    {i === 1 && (
                      <p className="text-xs text-muted-foreground">Typically 24–48 hrs</p>
                    )}
                  </div>
                  {s.done && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
                </div>
              );
            })}
          </div>

          {/* Email info */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-6 flex items-start gap-2 text-left">
            <Mail className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              You'll receive an email at <strong className="text-foreground">{user?.email}</strong> once your account is approved or if further information is needed.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              className="w-full gap-2 bg-primary text-primary-foreground"
              onClick={handleCheckStatus}
              disabled={checking}
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking…" : "Check Approval Status"}
            </Button>

            <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Questions?{" "}
          <Link to="mailto:support@voyageur.com" className="text-primary hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
};

export default OwnerPendingApproval;
