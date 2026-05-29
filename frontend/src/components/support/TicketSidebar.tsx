import { TicketSummary } from "./types";

interface TicketSidebarProps {
  tickets: TicketSummary[];
  selectedTicketId: string | null;
  isLoading: boolean;
  onSelectTicket: (ticketId: string) => void;
  onNewTicket: () => void;
}

const getRelativeTime = (timestamp: string): string => {
  const now = Date.now();
  const date = new Date(timestamp).getTime();
  const diffMs = Math.max(now - date, 0);

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "just now";
  }
  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)} min ago`;
  }
  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)} hours ago`;
  }
  return `${Math.floor(diffMs / day)} days ago`;
};

export const TicketSidebar = ({
  tickets,
  selectedTicketId,
  isLoading,
  onSelectTicket,
  onNewTicket,
}: TicketSidebarProps): JSX.Element => {
  return (
    <aside className="h-full w-full bg-white flex flex-col overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] uppercase tracking-widest text-[#94A3B8] font-medium">
            Support tickets
          </span>
        </div>
        <button
          onClick={onNewTicket}
          className="w-full bg-[#0F172A] text-white py-2.5 rounded-xl text-[13px] uppercase tracking-[0.08em] font-medium hover:bg-[#1E293B] transition-colors"
        >
          + New ticket
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {isLoading ? (
          <div className="px-5 py-4 space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-2/3 bg-slate-100 rounded-lg"></div>
                  <div className="h-4 w-12 bg-slate-100 rounded-full"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-3 w-16 bg-slate-50 rounded-lg"></div>
                  <div className="h-3 w-20 bg-slate-50 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="px-5 py-4 text-[13px] text-slate-400">No tickets found.</div>
        ) : (
          <div>
            {tickets.map((ticket) => {
              const isSelected = ticket.id === selectedTicketId;
              const statusClassName =
                ticket.status === "OPEN"
                  ? "bg-[#DCFCE7] text-[#166534]"
                  : "bg-[#F1F5F9] text-[#64748B]";

              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => onSelectTicket(ticket.id)}
                  className={`w-full text-left px-5 py-4 border-b border-[#E2E8F0] bg-white transition-all duration-300 animate-in fade-in slide-in-from-left-2 ${
                    isSelected
                      ? "bg-[#F8FAFC] border-l-[3px] border-l-[#0F172A]"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[14px] font-medium text-[#1E293B]">{ticket.subject}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusClassName}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[12px] text-[#94A3B8]">
                    <span>{ticket._count.replies} replies</span>
                    <span>{getRelativeTime(ticket.updatedAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
