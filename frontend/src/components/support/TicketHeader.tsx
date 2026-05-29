import { TicketStatus, TicketStreamConnectionState } from "./types";

interface TicketHeaderProps {
  subject: string;
  status: TicketStatus;
  canClose: boolean;
  isClosing: boolean;
  connectionState: TicketStreamConnectionState;
  onCloseTicket: () => void;
}

export const TicketHeader = ({
  subject,
  status,
  canClose,
  isClosing,
  connectionState,
  onCloseTicket,
}: TicketHeaderProps): JSX.Element => {
  const statusClassName =
    status === "OPEN"
      ? "bg-[#DCFCE7] text-[#166534]"
      : "bg-[#F1F5F9] text-[#64748B]";
  const isConnected = connectionState === "connected";

  return (
    <header className="sticky top-0 z-10 h-14 border-b border-[#E2E8F0] bg-white px-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-medium text-[#1E293B]">{subject}</h2>
          <div className="mt-1 flex items-center gap-2.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusClassName}`}>
              {status}
            </span>
            {status === "OPEN" && (
              <div className="flex items-center gap-2">
                <span className="relative inline-flex h-2 w-2">
                  {isConnected && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/70 animate-ping" />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      isConnected ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                </span>
                <span className="text-xs text-[#94A3B8]">
                  {isConnected ? "Live" : "Reconnecting..."}
                </span>
              </div>
            )}
          </div>
        </div>

        {status === "OPEN" && canClose && (
          <button
            type="button"
            onClick={onCloseTicket}
            disabled={isClosing}
            className="h-8 rounded-xl border border-[#E2E8F0] px-3.5 text-[13px] text-[#64748B] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isClosing ? "Closing..." : "Close ticket"}
          </button>
        )}
      </div>
    </header>
  );
};
