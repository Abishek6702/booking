/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLocation, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Lock, AlertCircle, Shield, Smartphone, Wallet as WalletIcon, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBooking } from "@/context/BookingContext";
import api from "@/lib/api";
import { toast } from "sonner";

import paytmLogo from "@/assets/paytm.svg";
import phonepeLogo from "@/assets/phonepe.svg";
import amazonPayLogo from "@/assets/amazonpay.svg";
import mobikwikLogo from "@/assets/mobikwik.svg";
import visaLogo from "@/assets/visa.svg";
import mastercardLogo from "@/assets/mastercard.svg";
import rupayLogo from "@/assets/rupay.svg";
import upiLogo from "@/assets/upi.svg";

const cardSchema = z.object({
  cardNumber: z.string().min(19, "Card number must be 16 digits").max(19),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, "Format: MM/YY"),
  cvc: z.string().min(3, "CVC must be 3 digits").max(4),
  cardName: z.string().min(2, "Cardholder name required"),
});
type CardFormData = z.infer<typeof cardSchema>;

const formatCardNumber = (v: string) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

const WALLET_LOGOS: Record<string, string> = {
  Paytm: paytmLogo,
  PhonePe: phonepeLogo,
  "Amazon Pay": amazonPayLogo,
  MobiKwik: mobikwikLogo,
};

const getCardType = (num: string) => {
  const clean = num.replace(/\D/g, "");
  if (clean.startsWith("4")) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(clean)) return "mastercard";
  if (/^(60|65|81|82|508)/.test(clean)) return "rupay";
  return "unknown";
};

const PaymentPage = () => {
  const { bookingId, idempotencyKey } = useBooking();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as any;

  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "wallet">("card");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const cardType = getCardType(cardNumber);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
  });

  const totalAmount = Number(state?.total ?? 0);

  const processPayment = async (data?: CardFormData) => {
    if (!bookingId) {
      toast.error("No active booking found");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/payments/process", {
        bookingId,
        paymentMethod,
        amount: totalAmount,
        currency: "INR",
        details: paymentMethod === "card" ? data : { upiId },
      }, {
        headers: {
          "idempotencyKey": idempotencyKey || crypto.randomUUID(),
        }
      });

      if (response.data.success) {
        toast.success("Payment successful!");
        navigate("/confirmation", {
          state: {
            ...state,
            paymentId: response.data.data.id,
            bookingId: bookingId,
            paid: true,
          },
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (val: number) => `₹${new Intl.NumberFormat("en-IN").format(Math.round(val))}`;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-primary/5 blur-[100px] rounded-full" />
      </div>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-3xl relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <Link 
            to={-1 as never} 
            className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Payment Methods</h1>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5">Secure Transaction Platform</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Summary Banner */}
          <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Shield className="h-32 w-32" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Total Payable Amount</p>
                <div className="flex items-end gap-2">
                  <h2 className="text-4xl font-black">{formatPrice(totalAmount)}</h2>
                  <p className="text-xs text-white/60 font-bold mb-2">INR · Inclusive of Taxes</p>
                </div>
              </div>
              <div className="h-px md:h-12 w-full md:w-px bg-white/10" />
              <div className="space-y-1 text-left md:text-right">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Booking Reference</p>
                <p className="text-sm font-black text-white/90">#{String(bookingId).slice(-8).toUpperCase()}</p>
                <p className="text-[10px] font-bold text-white/50">{state?.propertyName || "WAYNEXX Suite Booking"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
            <div className="p-6 md:p-10">
              <Tabs defaultValue="card" className="w-full" onValueChange={(v: any) => setPaymentMethod(v)}>
                <TabsList className="grid w-full grid-cols-3 mb-10 h-14 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                  <TabsTrigger value="card" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <CreditCard className="h-4 w-4 mr-2" /> Card
                  </TabsTrigger>
                  <TabsTrigger value="upi" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Smartphone className="h-4 w-4 mr-2" /> UPI
                  </TabsTrigger>
                  <TabsTrigger value="wallet" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <WalletIcon className="h-4 w-4 mr-2" /> Wallets
                  </TabsTrigger>
                </TabsList>

                <div className="min-h-[280px]">
                  <TabsContent value="card" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Card Number</label>
                        <div className="relative group">
                          <Input
                            placeholder="0000 0000 0000 0000"
                            value={cardNumber}
                            onChange={(e) => {
                              const formatted = formatCardNumber(e.target.value);
                              setCardNumber(formatted);
                              setValue("cardNumber", formatted);
                            }}
                            maxLength={19}
                            className={`h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-lg focus:ring-primary/10 transition-all ${errors.cardNumber ? "border-rose-400" : ""}`}
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <img src={visaLogo} alt="Visa" className={`h-4 w-auto object-contain transition-opacity duration-300 ${cardType === "visa" || cardType === "unknown" ? "opacity-100" : "opacity-20"}`} />
                            <img src={mastercardLogo} alt="Mastercard" className={`h-6 w-auto object-contain transition-opacity duration-300 ${cardType === "mastercard" || cardType === "unknown" ? "opacity-100" : "opacity-20"}`} />
                            <img src={rupayLogo} alt="RuPay" className={`h-4 w-auto object-contain transition-opacity duration-300 ${cardType === "rupay" || cardType === "unknown" ? "opacity-100" : "opacity-20"}`} />
                          </div>
                        </div>
                        {errors.cardNumber && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.cardNumber.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Expiry Date</label>
                          <Input
                            placeholder="MM/YY"
                            value={expiry}
                            onChange={(e) => {
                              const formatted = formatExpiry(e.target.value);
                              setExpiry(formatted);
                              setValue("expiry", formatted);
                            }}
                            maxLength={5}
                            className={`h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold focus:ring-primary/10 transition-all ${errors.expiry ? "border-rose-400" : ""}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Security Code (CVC)</label>
                          <Input
                            placeholder="•••"
                            type="password"
                            maxLength={4}
                            className={`h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold focus:ring-primary/10 transition-all ${errors.cvc ? "border-rose-400" : ""}`}
                            {...register("cvc")}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Cardholder Name</label>
                        <Input
                          placeholder="AS SHOWN ON CARD"
                          className={`h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold uppercase tracking-wider focus:ring-primary/10 transition-all ${errors.cardName ? "border-rose-400" : ""}`}
                          {...register("cardName")}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleSubmit(processPayment)}
                      disabled={loading} 
                      className="w-full bg-primary text-white hover:bg-slate-800 h-16 rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 transition-all group"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <span className="flex items-center gap-2">
                          Authorize Payment <Lock className="h-4 w-4 text-white/50 group-hover:text-white transition-colors" />
                        </span>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="upi" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex items-center gap-4">
                      <div className="h-10 w-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 p-1">
                        <img src={upiLogo} alt="UPI" className="h-8 w-auto object-contain" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 leading-tight">Instant UPI Payment</p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Pay directly using any BHIM UPI enabled app like GPay, PhonePe, or Paytm.</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">VPA / UPI ID</label>
                        <Input 
                          placeholder="e.g. username@okaxis" 
                          value={upiId} 
                          onChange={(e) => setUpiId(e.target.value)} 
                          className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-lg"
                        />
                        <div className="flex gap-2 mt-2 ml-1 overflow-x-auto pb-2 scrollbar-hide">
                          {["@okaxis", "@paytm", "@upi", "@ybl"].map(ext => (
                            <button 
                              key={ext} 
                              onClick={() => setUpiId(prev => prev.split("@")[0] + ext)}
                              className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500 hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                            >
                              {ext}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button 
                        onClick={() => processPayment()} 
                        disabled={loading || !upiId} 
                        className="w-full bg-primary text-white hover:bg-slate-800 h-16 rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Pay"}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="wallet" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      {["Paytm", "PhonePe", "Amazon Pay", "MobiKwik"].map((w) => (
                        <button key={w} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center hover:border-primary hover:bg-primary/5 transition-all group active:scale-[0.98] w-full flex flex-col justify-center items-center">
                          <img src={WALLET_LOGOS[w]} alt={w} className="h-8 w-auto mx-auto mb-3 opacity-80 group-hover:opacity-100 transition-opacity object-contain" />
                          <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{w}</p>
                        </button>
                      ))}
                    </div>
                    <Button onClick={() => processPayment()} disabled={loading} className="w-full bg-primary text-white hover:bg-slate-800 h-16 rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200">
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Link & Authenticate"}
                    </Button>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="mt-10 pt-10 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-center gap-6 opacity-40">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <Shield className="h-3 w-3" /> PCI DSS Compliant
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <CheckCircle2 className="h-3 w-3" /> Trusted Platform
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <Lock className="h-3 w-3" /> SSL Secured
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentPage;

