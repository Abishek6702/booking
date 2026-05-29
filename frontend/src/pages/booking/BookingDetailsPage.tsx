import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Ban,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  Star,
  UserCircle2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { exportToPDF } from "@/utils/exportUtils";

interface BookingRecord {
  id: string;
  type?: string;
  status?: string;
  stayId?: string | null;
  roomId?: string | null;
  checkIn?: string;
  checkOut?: string;
  guests?: unknown;
  guestDetails?: unknown;
  createdAt?: string;
  totalAmount?: number | string;
  totalPrice?: number | string;
  stay?: {
    id?: string;
    title?: string;
    name?: string;
    city?: string;
    country?: string;
    images?: string[];
  } | null;
  room?: {
    id?: string;
    name?: string;
  } | null;
}

interface RoomRecord {
  id: string;
  name?: string;
  pricePerNight?: number | string;
  bedType?: string;
  maxGuests?: number;
  amenities?: string[];
  options?: unknown;
}

interface StayRecord {
  id: string;
  title?: string;
  type?: string;
  city?: string;
  country?: string;
  images?: string[];
  amenities?: string[];
  avgRating?: number | string;
  policies?: unknown;
}

interface PaymentRecord {
  id: string;
  bookingId: string;
  amount?: number | string;
  currency?: string;
  paymentMethod?: string;
  status?: string;
  createdAt?: string;
}

interface PreviewPricing {
  basePrice: number;
  taxes: number;
  serviceFee: number;
  totalAmount: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (isRecord(value) && typeof value.toNumber === "function") {
    try {
      const parsed = Number((value.toNumber as () => unknown)());
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }
  return 0;
};

const formatCurrency = (value: number): string =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value || 0))}`;

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value?: string): string => {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeStatus = (status?: string): string => String(status ?? "").trim().toLowerCase();

const toTitleCase = (value: string): string =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const computeNights = (checkIn?: string, checkOut?: string): number => {
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);
  if (!start || !end) return 1;
  const diff = end.getTime() - start.getTime();
  if (diff <= 0) return 1;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const toGuestsPayload = (guests: unknown): Record<string, number> => {
  if (!isRecord(guests)) return { adults: 1, children: 0 };
  const adults = Math.max(1, Math.round(toNumber(guests.adults)));
  const children = Math.max(0, Math.round(toNumber(guests.children)));
  return { adults, children };
};

const getStatusMeta = (status?: string): { label: string; className: string } => {
  const normalized = normalizeStatus(status);

  if (["confirmed", "completed", "paid"].includes(normalized)) {
    return {
      label: normalized === "completed" ? "COMPLETED" : "CONFIRMED",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
  }

  if (["pending", "hold", "payment_pending", "processing", "driver_accepted", "arrived", "ongoing", "in_progress"].includes(normalized)) {
    return {
      label: "PENDING",
      className: "bg-amber-50 text-amber-700 border border-amber-200",
    };
  }

  if (["cancelled", "expired", "failed", "rejected", "driver_rejected", "cancelled_by_customer", "cancelled_by_driver"].includes(normalized)) {
    return {
      label: "CANCELLED",
      className: "bg-rose-50 text-rose-700 border border-rose-200",
    };
  }

  return {
    label: toTitleCase(normalized || "draft").toUpperCase(),
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  };
};

const getBookingTypeLabel = (type?: string): string => {
  const normalized = normalizeStatus(type);
  if (normalized === "vehicle") return "VEHICLE RIDE";
  if (normalized === "attraction") return "ATTRACTION BOOKING";
  return "STAY BOOKING";
};

const BookingDetailsPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [stay, setStay] = useState<StayRecord | null>(null);
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [previewPricing, setPreviewPricing] = useState<PreviewPricing | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadBookingDetails = async () => {
      if (!bookingId) {
        setFetchError("Invalid booking reference.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setFetchError(null);
        setPreviewPricing(null);

        const [bookingsRes, paymentsRes] = await Promise.allSettled([
          api.get("/bookings"),
          api.get("/payments"),
        ]);

        if (bookingsRes.status !== "fulfilled") {
          throw new Error("Bookings fetch failed");
        }

        const allBookings = asArray<BookingRecord>(bookingsRes.value.data?.data);
        const paymentsData = paymentsRes.status === "fulfilled"
          ? asArray<PaymentRecord>(paymentsRes.value.data?.data)
          : [];
        let activeBooking = allBookings.find((item) => item.id === bookingId) ?? null;

        if (!activeBooking) {
          const fallbackRes = await api.get(`/bookings/${bookingId}`);
          activeBooking = (fallbackRes.data?.data as BookingRecord | undefined) ?? null;
        }

        if (!activeBooking) {
          throw new Error("Booking not found");
        }

        const matchingPayments = paymentsData
          .filter((entry) => entry.bookingId === activeBooking?.id)
          .sort((left, right) => (new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()));
        const successfulPayment = matchingPayments.find((entry) => normalizeStatus(entry.status) === "success");
        const selectedPayment = successfulPayment ?? matchingPayments[0] ?? null;

        let matchedRoom: RoomRecord | null = null;
        let stayDetails: StayRecord | null = null;

        if (activeBooking.stayId) {
          const [stayRes, roomsRes] = await Promise.allSettled([
            api.get(`/stays/${activeBooking.stayId}`),
            api.get(`/stays/${activeBooking.stayId}/rooms`),
          ]);

          if (stayRes.status === "fulfilled") {
            stayDetails = (stayRes.value.data?.data as StayRecord | undefined) ?? null;
          }

          if (roomsRes.status === "fulfilled") {
            const allRooms = asArray<RoomRecord>(roomsRes.value.data?.data);
            matchedRoom = allRooms.find((entry) => entry.id === activeBooking?.roomId) ?? null;
          }
        }

        if (
          normalizeStatus(activeBooking.type) === "stay" &&
          activeBooking.stayId &&
          activeBooking.roomId &&
          activeBooking.checkIn &&
          activeBooking.checkOut
        ) {
          try {
            const previewRes = await api.post("/bookings/preview", {
              type: "stay",
              stayId: activeBooking.stayId,
              roomId: activeBooking.roomId,
              checkIn: activeBooking.checkIn,
              checkOut: activeBooking.checkOut,
              guests: toGuestsPayload(activeBooking.guests),
              guestDetails: isRecord(activeBooking.guestDetails) ? activeBooking.guestDetails : {},
            });

            const previewData = previewRes.data?.data;
            if (previewData && !ignore) {
              setPreviewPricing({
                basePrice: toNumber(previewData.basePrice),
                taxes: toNumber(previewData.taxes),
                serviceFee: toNumber(previewData.serviceFee),
                totalAmount: toNumber(previewData.totalAmount),
              });
            }
          } catch {
            if (!ignore) {
              setPreviewPricing(null);
            }
          }
        }

        if (!ignore) {
          setBooking(activeBooking);
          setStay(stayDetails);
          setRoom(matchedRoom);
          setPayment(selectedPayment);
        }
      } catch {
        if (!ignore) {
          setFetchError("Unable to load booking details.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadBookingDetails();
    return () => {
      ignore = true;
    };
  }, [bookingId]);

  const storedUser = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("tm_user") ?? "{}");
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }, []);

  const guestDetails = useMemo(
    () => (isRecord(booking?.guestDetails) ? booking?.guestDetails : {}),
    [booking?.guestDetails],
  );
  const guests = useMemo(() => toGuestsPayload(booking?.guests), [booking?.guests]);
  const nights = useMemo(() => computeNights(booking?.checkIn, booking?.checkOut), [booking?.checkIn, booking?.checkOut]);
  const statusMeta = useMemo(() => getStatusMeta(booking?.status), [booking?.status]);

  const bookingReference = booking?.id ? `#${booking.id.slice(-6).toUpperCase()}` : "#N/A";
  const bookingTypeLabel = getBookingTypeLabel(booking?.type);
  const propertyName = stay?.title || booking?.stay?.title || booking?.stay?.name || "WAYNEXX Stay";
  const propertyType = toTitleCase(String(stay?.type || "Hotel"));
  const ratingValue = toNumber(stay?.avgRating);
  const ratingDisplay = ratingValue > 0 ? ratingValue.toFixed(1) : "4.8";
  const ratingStars = ratingValue > 0 ? Math.round(Math.min(5, Math.max(0, ratingValue))) : 5;
  const propertyImage = stay?.images?.[0] || booking?.stay?.images?.[0] || "";
  const propertyLocation = [stay?.city || booking?.stay?.city, stay?.country || booking?.stay?.country]
    .filter(Boolean)
    .join(", ") || "Location unavailable";

  const roomType = room?.name || booking?.room?.name || "Standard Suite - Queen Bed";
  const roomsCount = Math.max(
    1,
    Math.round(toNumber(guestDetails.roomCount ?? guestDetails.rooms ?? guestDetails.numberOfRooms)),
  );

  const guestName = String(
    [guestDetails.firstName, guestDetails.lastName].filter(Boolean).join(" ")
    || guestDetails.name
    || storedUser.name
    || "Primary Guest",
  );
  const guestEmail = String(guestDetails.email || storedUser.email || "—");
  const guestPhone = String(guestDetails.phone || storedUser.phone || "—");

  const roomRate = toNumber(room?.pricePerNight) || (previewPricing ? previewPricing.basePrice / nights : 0);
  const subtotal = previewPricing
    ? previewPricing.basePrice
    : roomRate > 0
      ? roomRate * nights
      : toNumber(booking?.totalAmount ?? booking?.totalPrice);
  const gstAmount = previewPricing ? previewPricing.taxes : subtotal * 0.12;
  const serviceFee = previewPricing ? previewPricing.serviceFee : 0;
  const discount = Math.max(0, toNumber(guestDetails.discountAmount ?? guestDetails.discount ?? guestDetails.couponDiscount));
  const computedTotal = previewPricing ? previewPricing.totalAmount : subtotal + gstAmount + serviceFee;
  const successfulPaidAmount = payment && normalizeStatus(payment.status) === "success" ? toNumber(payment.amount) : 0;
  const finalTotal = Math.max(0, successfulPaidAmount || computedTotal - discount);
  const isPaid = successfulPaidAmount > 0;
  const paymentMethod = payment?.paymentMethod ? String(payment.paymentMethod).toUpperCase() : null;
  const paymentDate = payment?.createdAt || null;

  const roomOptions = isRecord(room?.options) ? room.options : null;
  const roomPolicies = roomOptions && isRecord(roomOptions.policies) ? roomOptions.policies : null;
  const stayPolicies = isRecord(stay?.policies) ? stay.policies : null;
  const freeCancellationEnabled = Boolean(
    roomPolicies?.freeCancellation ?? stayPolicies?.freeCancellation ?? true,
  );
  const freeCancellationUntil = typeof stayPolicies?.freeCancellationUntil === "string"
    ? stayPolicies.freeCancellationUntil
    : null;
  const cancellationHours = Math.max(
    1,
    Math.round(toNumber(roomPolicies?.cancellationDeadline ?? stayPolicies?.cancellationDeadline ?? 48)),
  );
  const freeCancellationDeadline = freeCancellationEnabled
    ? freeCancellationUntil || `${cancellationHours} hours before check-in`
    : "Free cancellation not available";
  const penaltyDetails = freeCancellationEnabled
    ? "After deadline, the first night amount is non-refundable."
    : "This booking is non-refundable after confirmation.";

  const inclusions = useMemo(() => {
    const roomAmenities = asArray<string>(room?.amenities);
    const stayAmenities = asArray<string>(stay?.amenities);
    const merged = [...roomAmenities, ...stayAmenities]
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .filter((item, index, self) => self.indexOf(item) === index);
    return merged.length > 0 ? merged.slice(0, 10) : ["Free WiFi", "Breakfast", "Pool Access"];
  }, [room?.amenities, stay?.amenities]);

  const canCancel = booking
    ? ![
      "cancelled",
      "completed",
      "expired",
      "failed",
      "rejected",
      "cancelled_by_customer",
      "cancelled_by_driver",
      "driver_rejected",
    ].includes(normalizeStatus(booking.status))
    : false;

  const handleCancelBooking = async () => {
    if (!booking || !canCancel) return;
    try {
      const response = await api.post(`/bookings/${booking.id}/cancel`, {
        reason: "Cancelled by traveler from booking details page",
      });
      const nextStatus = response.data?.data?.status || "cancelled";
      setBooking((current) => (current ? { ...current, status: nextStatus } : current));
      toast.success("Booking cancelled successfully.");
    } catch (error: unknown) {
      const message = isRecord(error) && isRecord(error.response) && isRecord(error.response.data) && typeof error.response.data.message === "string"
        ? error.response.data.message
        : "Unable to cancel booking.";
      toast.error(message);
    }
  };

  const handleDownloadReceipt = () => {
    if (!booking) return;

    const headers = ["Field", "Value"];
    const rows = [
      ["Booking Reference", bookingReference],
      ["Booking Type", bookingTypeLabel],
      ["Property", propertyName],
      ["Location", propertyLocation],
      ["Room Type", roomType],
      ["Check-in", formatDateTime(booking.checkIn)],
      ["Check-out", formatDateTime(booking.checkOut)],
      ["Guests", `${guests.adults} Adults, ${guests.children} Children`],
      ["Total", formatCurrency(finalTotal)],
      ["Payment Status", isPaid ? "Paid" : "Awaiting Payment"],
      ["Payment Method", paymentMethod || "N/A"],
      ["Payment Date", paymentDate ? formatDateTime(paymentDate) : "N/A"],
    ];

    exportToPDF(
      headers,
      rows,
      `voyageur-receipt-${bookingReference.replace("#", "")}`,
      "WAYNEXX Booking Receipt",
    );
    toast.success("Receipt downloaded.");
  };

  const handleContactProperty = () => {
    if (!booking) return;
    navigate(`/support?bookingId=${booking.id}&topic=property`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="container mx-auto px-4 py-24 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking || fetchError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16 max-w-xl">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
            <p className="text-sm font-bold text-slate-700">{fetchError || "Booking not found."}</p>
            <Button onClick={() => navigate("/dashboard")} className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest">
              Back to Dashboard
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8 md:py-10 space-y-6">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Booking Reference</p>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{bookingReference}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-[10px] font-black tracking-wider">
                  {bookingTypeLabel}
                </Badge>
                <Badge className={`rounded-full px-3 py-1 text-[10px] font-black tracking-wider ${statusMeta.className}`}>
                  {statusMeta.label}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={handleCancelBooking}
                disabled={!canCancel}
                className="h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              >
                <Ban className="h-3.5 w-3.5 mr-2" />
                Cancel Booking
              </Button>
              <Button
                onClick={handleDownloadReceipt}
                className="h-10 rounded-xl bg-primary text-white hover:bg-primary/90 text-[10px] font-black uppercase tracking-widest"
              >
                <ReceiptText className="h-3.5 w-3.5 mr-2" />
                Download Receipt
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
          {propertyImage ? (
            <img
              src={propertyImage}
              alt={propertyName}
              className="w-full h-48 md:h-56 object-cover rounded-xl border border-slate-100"
            />
          ) : (
            <div className="w-full h-48 md:h-56 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <BedDouble className="h-8 w-8 text-slate-400" />
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{propertyName}</h2>
              <p className="text-sm text-slate-500 font-bold">{propertyType}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">{ratingDisplay}</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`h-3.5 w-3.5 ${index < ratingStars ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {propertyLocation}
          </p>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Stay Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Check-in</p>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {formatDateTime(booking.checkIn)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Check-out</p>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-primary" />
                    {formatDateTime(booking.checkOut)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Number of nights</p>
                  <p className="text-sm font-bold text-slate-900">{nights}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Room type</p>
                  <p className="text-sm font-bold text-slate-900">{roomType}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Guests</p>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {guests.adults} Adults, {guests.children} Children
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Rooms</p>
                  <p className="text-sm font-bold text-slate-900">{roomsCount}</p>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Guest Details</h3>
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCircle2 className="h-4 w-4 text-primary" />
                  {guestName}
                </p>
                <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {guestEmail}
                </p>
                <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {guestPhone}
                </p>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Amenities & Inclusions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {inclusions.map((item) => (
                  <p key={item} className="text-sm text-slate-700 font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {item}
                  </p>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Cancellation Policy</h3>
              <div className="space-y-2">
                <p className="text-sm text-slate-700 font-medium">
                  <span className="font-black text-slate-900">Free cancellation deadline:</span> {freeCancellationDeadline}
                </p>
                <p className="text-sm text-slate-700 font-medium">
                  <span className="font-black text-slate-900">Penalty after deadline:</span> {penaltyDetails}
                </p>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Need Help?</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={handleContactProperty}
                  className="h-10 rounded-xl border-slate-200 text-[10px] font-black uppercase tracking-widest"
                >
                  Contact Property
                </Button>
                <Button asChild className="h-10 rounded-xl bg-primary text-white hover:bg-primary/90 text-[10px] font-black uppercase tracking-widest">
                  <Link to={`/support?bookingId=${booking.id}`}>Contact WAYNEXX Support</Link>
                </Button>
                <Button asChild variant="ghost" className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">
                  <Link to="/support">
                    <CircleHelp className="h-3.5 w-3.5 mr-2" />
                    FAQ
                  </Link>
                </Button>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4 xl:sticky xl:top-24">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Payment Breakdown</h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>Room rate ({formatCurrency(roomRate)} × {nights} nights)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>CGST (6%)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(gstAmount / 2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>SGST (6%)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(gstAmount / 2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>Service fee</span>
                  <span className="font-bold text-slate-900">{formatCurrency(serviceFee)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>Discount</span>
                    <span className="font-bold text-emerald-700">-{formatCurrency(discount)}</span>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {isPaid ? "Total Amount Paid" : "Total Amount"}
                </p>
                <p className="text-3xl font-black text-slate-900">{formatCurrency(finalTotal)}</p>
              </div>

              <div className={`rounded-xl border p-4 space-y-2 ${isPaid ? "bg-slate-50 border-slate-200" : "bg-amber-50/50 border-amber-100"}`}>
                <p className="text-xs font-bold text-slate-700">
                  Payment status: <span className={isPaid ? "text-emerald-700" : "text-amber-700"}>{isPaid ? "Paid" : "Awaiting Payment"}</span>
                </p>
                {paymentMethod && <p className="text-xs font-bold text-slate-700">Payment method: {paymentMethod}</p>}
                {paymentDate && <p className="text-xs font-bold text-slate-700">Payment date: {formatDateTime(paymentDate)}</p>}
              </div>

              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs text-slate-700 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                All prices are shown in INR and include booking charges as applicable.
              </div>
            </section>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingDetailsPage;

