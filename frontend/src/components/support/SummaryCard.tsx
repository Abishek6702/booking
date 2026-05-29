import { Loader2 } from "lucide-react";

export const SummaryCard = ({
  category,
  bookingId,
  issueType,
  description,
  onSubmit,
  onReset,
  isSubmitting,
}: {
  category: string;
  bookingId: string | null;
  issueType: string;
  description: string;
  onSubmit: () => void;
  onReset: () => void;
  isSubmitting: boolean;
}) => {
  return (
    <div className="mt-3 ml-11 w-full max-w-sm animate-[fadeUp_0.25s_ease-out_0.2s_both]">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
        <h4 className="text-[12px] font-bold text-[#64748B] uppercase tracking-[0.08em] mb-3">Ticket Summary</h4>
        
        <div className="space-y-2 text-[13px]">
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="text-[#64748B]">Category</span>
            <span className="text-[#1E293B] font-medium">{category}</span>
          </div>
          
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="text-[#64748B]">Booking</span>
            <span className="text-[#1E293B] font-medium">{bookingId || "Not applicable"}</span>
          </div>
          
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="text-[#64748B]">Issue</span>
            <span className="text-[#1E293B] font-medium">{issueType}</span>
          </div>
          
          <div className="grid grid-cols-[80px_1fr] gap-2 mt-2 pt-2 border-t border-[#E2E8F0]">
            <span className="text-[#64748B]">Details</span>
            <p className="text-[#1E293B] line-clamp-2">{description}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full bg-[#0F172A] text-white py-2.5 rounded-xl text-[13px] font-medium hover:bg-[#1E293B] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "✓ Submit & connect to support"}
        </button>
        <button
          onClick={onReset}
          disabled={isSubmitting}
          className="w-full bg-transparent border border-[#E2E8F0] text-[#1E293B] py-2.5 rounded-xl text-[13px] font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          ← Start over
        </button>
      </div>
    </div>
  );
};
