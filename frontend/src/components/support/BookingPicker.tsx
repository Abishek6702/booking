import { ChevronRight, Home, Car, Ticket } from "lucide-react";

interface Booking {
  id: string;
  type?: string;
  status?: string;
  checkIn?: string;
  checkOut?: string;
  pickupDate?: string;
  dropoffDate?: string;
  visitDate?: string;
  createdAt?: string;
  stay?: { title?: string };
  room?: { name?: string };
  vehicle?: { model?: string };
  attraction?: { name?: string };
}

export const BookingPicker = ({ bookings, onSelect }: { bookings: Booking[]; onSelect: (id: string) => void }) => {
  return (
    <div className="flex flex-col gap-2 mt-3 ml-11 animate-[fadeUp_0.25s_ease-out_0.2s_both] w-full max-w-sm">
      {bookings.map((b) => {
        const isStay = !!b.stay || !!b.room || b.type === "stay";
        const isVehicle = !!b.vehicle || b.type === "vehicle";
        const isAttraction = !!b.attraction || b.type === "attraction";

        const title =
          b.stay?.title ||
          b.room?.name ||
          b.vehicle?.model ||
          b.attraction?.name ||
          `Booking #${b.id.slice(0, 8)}`;

        const startDate = b.checkIn || b.pickupDate || b.visitDate || b.createdAt;
        const endDate = b.checkOut || b.dropoffDate;
        let dateRange = "Date unavailable";
        if (startDate) {
          const d1 = new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (endDate) {
            const d2 = new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            dateRange = `${d1} – ${d2}`;
          } else {
            dateRange = d1;
          }
        }

        const status = b.status?.toUpperCase() || "PENDING";

        return (
          <button
            key={b.id}
            onClick={() => onSelect(b.id)}
            className="flex items-center text-left bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#0F172A] rounded-xl p-3 transition-all duration-200 group relative overflow-hidden focus:outline-none focus:border-[#0F172A]"
          >
            {/* Focus/hover indicator border left */}
            <div className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-[3px] group-focus:w-[3px] bg-[#0F172A] transition-all" />

            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mr-3 text-slate-500">
              {isStay ? <Home className="w-5 h-5" /> : isVehicle ? <Car className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-[#1E293B] font-semibold truncate">{title}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[12px] text-[#64748B]">{dateRange}</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 tracking-wider">
                  {status}
                </span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-[#94A3B8] ml-2 group-hover:text-[#0F172A]" />
          </button>
        );
      })}
    </div>
  );
};
