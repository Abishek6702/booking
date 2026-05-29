/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLocation, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MapPin, Calendar, Users, Shield, AlertCircle, CheckCircle2,
  ArrowLeft, Info, Home, CreditCard, ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useBooking } from "@/context/BookingContext";

const schema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Phone number must be at least 7 digits").regex(/^[+\d\s\-()]+$/, "Invalid phone number"),

  // Address
  addressLine1: z.string().min(5, "Address must be at least 5 characters"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be a 6-digit number"),

  // ID Proof
  idType: z.enum(["aadhaar", "pan"], { required_error: "Please select an ID type" }),
  idNumber: z.string().min(1, "ID number is required"),

  specialRequests: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.idType === "aadhaar") {
    if (!/^\d{12}$/.test(data.idNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["idNumber"],
        message: "Aadhaar number must be exactly 12 digits",
      });
    }
  } else if (data.idType === "pan") {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.idNumber.toUpperCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["idNumber"],
        message: "PAN must be in format ABCDE1234F",
      });
    }
  }
});

type FormData = z.infer<typeof schema>;

const BookingPage = () => {
  const { setBookingDetails, setSelection } = useBooking();
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state as any;

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { idType: "aadhaar" },
  });

  const selectedIdType = watch("idType");

  const propertyName = booking?.propertyName ?? "Grand Parisian Hotel";
  const roomName = booking?.roomName ?? "Premium Suite";
  const nights = booking?.nights ?? 3;
  const subtotal = Number(booking?.subtotal ?? 0);
  const taxes = Number(booking?.taxes ?? 0);
  const total = Number(booking?.total ?? 0);
  const checkIn = booking?.checkIn ?? "—";
  const checkOut = booking?.checkOut ?? "—";
  const guestsString = typeof booking?.guests === 'string'
    ? booking.guests
    : `${booking?.guests?.adults || 2} Adults, ${booking?.guests?.children || 0} Children`;

  const onSubmit = async (data: FormData) => {
    try {
      const idempotencyKey = crypto.randomUUID();

      const payload = {
        type: booking.type || "stay",
        stayId: booking.stayId,
        roomId: booking.roomId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        guestDetails: {
          ...(booking.guestDetails || {}),
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          address: {
            line1: data.addressLine1,
            line2: data.addressLine2 || "",
            city: data.city,
            state: data.state,
            pincode: data.pincode,
          },
          idProof: {
            type: data.idType,
            number: data.idType === "pan" ? data.idNumber.toUpperCase() : data.idNumber,
          },
        },
        specialRequests: data.specialRequests,
      };

      const response = await api.post("/bookings", payload, {
        headers: { "idempotencyKey": idempotencyKey },
      });

      if (response.data.success) {
        const { id } = response.data.data;
        setBookingDetails(id, idempotencyKey);
        setSelection(booking);
        navigate("/payment", {
          state: { ...booking, guest: data, bookingId: id },
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create booking");
    }
  };

  const formatPrice = (val: number) =>
    `₹${new Intl.NumberFormat("en-IN").format(Math.round(val))}`;

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1 ml-1">
        <AlertCircle className="h-3 w-3" />{msg}
      </p>
    ) : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] selection:bg-primary/10">
      <Navbar />

      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-6xl relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <Link
            to={-1 as never}
            className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Complete Your Booking</h1>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5">Secure Checkout Process</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Main Form ── */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* ── Guest Information ── */}
              <section className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">Guest Information</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Primary guest details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">First Name *</label>
                      <Input
                        placeholder="e.g. Rahul"
                        {...register("firstName")}
                        className={`h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary transition-all font-bold ${errors.firstName ? "border-rose-400 ring-rose-400/10" : ""}`}
                      />
                      <FieldError msg={errors.firstName?.message} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Last Name *</label>
                      <Input
                        placeholder="e.g. Sharma"
                        {...register("lastName")}
                        className={`h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary transition-all font-bold ${errors.lastName ? "border-rose-400 ring-rose-400/10" : ""}`}
                      />
                      <FieldError msg={errors.lastName?.message} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address *</label>
                      <Input
                        placeholder="rahul@example.com"
                        type="email"
                        {...register("email")}
                        className={`h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary transition-all font-bold ${errors.email ? "border-rose-400 ring-rose-400/10" : ""}`}
                      />
                      <FieldError msg={errors.email?.message} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Phone Number *</label>
                      <Input
                        placeholder="+91 98765 43210"
                        type="tel"
                        {...register("phone")}
                        className={`h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary transition-all font-bold ${errors.phone ? "border-rose-400 ring-rose-400/10" : ""}`}
                      />
                      <FieldError msg={errors.phone?.message} />
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Address Details ── */}
              <section className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Home className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">Home Address</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Required for check-in verification</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Address Line 1 *</label>
                      <Input
                        placeholder="House No., Street, Area"
                        {...register("addressLine1")}
                        className={`h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary transition-all font-bold ${errors.addressLine1 ? "border-rose-400 ring-rose-400/10" : ""}`}
                      />
                      <FieldError msg={errors.addressLine1?.message} />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Address Line 2 <span className="normal-case text-slate-300">(optional)</span></label>
                      <Input
                        placeholder="Landmark, Apartment, Suite"
                        {...register("addressLine2")}
                        className="h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">City *</label>
                      <Input
                        placeholder="e.g. Chennai"
                        {...register("city")}
                        className={`h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary transition-all font-bold ${errors.city ? "border-rose-400 ring-rose-400/10" : ""}`}
                      />
                      <FieldError msg={errors.city?.message} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">State *</label>
                      <Input
                        placeholder="e.g. Tamil Nadu"
                        {...register("state")}
                        className={`h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary transition-all font-bold ${errors.state ? "border-rose-400 ring-rose-400/10" : ""}`}
                      />
                      <FieldError msg={errors.state?.message} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pincode *</label>
                      <Input
                        placeholder="e.g. 600001"
                        maxLength={6}
                        {...register("pincode")}
                        className={`h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary transition-all font-bold ${errors.pincode ? "border-rose-400 ring-rose-400/10" : ""}`}
                      />
                      <FieldError msg={errors.pincode?.message} />
                    </div>
                  </div>
                </div>
              </section>

              {/* ── ID Proof ── */}
              <section className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                    <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">Identity Proof</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Aadhaar or PAN — one is required</p>
                    </div>
                  </div>

                  {/* ID Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">ID Type *</label>
                    <div className="relative">
                      <select
                        {...register("idType")}
                        className={`w-full h-12 rounded-xl bg-slate-50/50 border border-slate-200 px-4 pr-10 text-sm font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all cursor-pointer ${errors.idType ? "border-rose-400" : ""}`}
                      >
                        <option value="aadhaar">Aadhaar Card (12-digit number)</option>
                        <option value="pan">PAN Card (e.g. ABCDE1234F)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                    <FieldError msg={errors.idType?.message} />
                  </div>

                  {/* ID Number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      {selectedIdType === "pan" ? "PAN Number *" : "Aadhaar Number *"}
                    </label>
                    <Input
                      placeholder={
                        selectedIdType === "pan"
                          ? "e.g. ABCDE1234F"
                          : "e.g. 1234 5678 9012"
                      }
                      maxLength={selectedIdType === "pan" ? 10 : 12}
                      {...register("idNumber")}
                      className={`h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-primary/20 focus:border-primary transition-all font-bold tracking-widest ${errors.idNumber ? "border-rose-400 ring-rose-400/10" : ""}`}
                      style={{ textTransform: selectedIdType === "pan" ? "uppercase" : "none" }}
                    />
                    <FieldError msg={errors.idNumber?.message} />
                  </div>

                  {/* Privacy notice */}
                  <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl">
                    <Shield className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                      Your ID details are encrypted and used solely for identity verification at check-in. We never share this information with third parties.
                    </p>
                  </div>
                </div>
              </section>

              {/* ── Special Requests ── */}
              <section className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                      <Info className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">Special Requests</h2>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Notes for the Property</label>
                    <textarea
                      {...register("specialRequests")}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 resize-none focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      rows={4}
                      placeholder="e.g. Dietary requirements, late check-in, preferred bed type..."
                    />
                  </div>
                </div>
              </section>

              {/* ── Submit ── */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 h-16 rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Securing Booking...
                    </div>
                  ) : "Proceed to Payment"}
                </Button>
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                  <Shield className="h-3 w-3" /> Encrypted &amp; Secure Booking
                </p>
              </div>
            </form>
          </div>

          {/* ── Sidebar Summary ── */}
          <div className="lg:col-span-4 sticky top-24">
            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-lg overflow-hidden">
              <div className="p-6 md:p-7 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-4">Summary</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-black text-slate-900 leading-tight">{propertyName}</p>
                      <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-primary" /> {booking?.city || "India"}
                      </p>
                    </div>

                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selected Room</p>
                          <p className="text-xs font-black text-slate-700 mt-0.5">{roomName}</p>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200/50 w-full" />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" /> Check-in
                          </p>
                          <p className="text-xs font-black text-slate-700 mt-0.5">
                            {checkIn === '—' ? 'Not selected' : new Date(checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" /> Check-out
                          </p>
                          <p className="text-xs font-black text-slate-700 mt-0.5">
                            {checkOut === '—' ? '—' : new Date(checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200/50 w-full" />

                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-black text-slate-700">{guestsString}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Base Fare ({nights} nights)</span>
                    <span className="text-slate-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Taxes &amp; Service Fees</span>
                    <span className="text-slate-900">{formatPrice(taxes)}</span>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Amount</p>
                      <p className="text-2xl font-black text-slate-900 leading-none">{formatPrice(total)}</p>
                    </div>
                    <p className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-full">Included GST</p>
                  </div>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Free Cancellation</p>
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5 leading-relaxed">Cancel anytime before 48h for a full refund. No immediate charges.</p>
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

export default BookingPage;
