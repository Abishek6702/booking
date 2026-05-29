import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../components/AdminLayout";
import { Button } from "../components/ui/button";
import api from "../lib/api";

type TicketStatus = "OPEN" | "CLOSED";

interface TicketSummary {
  id: string;
  userId: string;
  subject: string;
  status: TicketStatus;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    replies: number;
  };
}

interface TicketReply {
  id: string;
  senderId: string;
  message: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: "CUSTOMER" | "OWNER" | "ADMIN";
  };
}

interface TicketDetails {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: TicketStatus;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  replies: TicketReply[];
}

const AdminSupport = (): JSX.Element => {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetails | null>(null);
  const [replyText, setReplyText] = useState("");

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = async (silent = false): Promise<void> => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoadingList(true);
    }

    try {
      const response = await api.get("/admin/support/tickets?limit=100");
      const nextTickets = (response.data.data.tickets ?? []) as TicketSummary[];
      setTickets(nextTickets);

      setSelectedTicketId((current) => {
        if (current && nextTickets.some((ticket) => ticket.id === current)) {
          return current;
        }

        return nextTickets[0]?.id ?? null;
      });
    } catch {
      toast.error("Failed to load support tickets");
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  };

  const fetchTicketById = async (ticketId: string): Promise<void> => {
    setLoadingDetails(true);
    try {
      const response = await api.get(`/admin/support/tickets/${ticketId}`);
      setSelectedTicket(response.data.data as TicketDetails);
    } catch {
      toast.error("Failed to load ticket conversation");
      setSelectedTicket(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }

    fetchTicketById(selectedTicketId);
  }, [selectedTicketId]);

  const handleSendReply = async (): Promise<void> => {
    if (!selectedTicket || !replyText.trim()) {
      return;
    }

    setSendingReply(true);
    try {
      await api.post(`/admin/support/tickets/${selectedTicket.id}/reply`, {
        message: replyText.trim(),
      });

      toast.success("Reply sent");
      setReplyText("");
      await Promise.all([fetchTicketById(selectedTicket.id), fetchTickets(true)]);
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async (): Promise<void> => {
    if (!selectedTicket || selectedTicket.status === "CLOSED") {
      return;
    }

    setClosingTicket(true);
    try {
      await api.put(`/admin/support/tickets/${selectedTicket.id}/close`);
      toast.success("Ticket closed");
      await Promise.all([fetchTicketById(selectedTicket.id), fetchTickets(true)]);
    } catch {
      toast.error("Failed to close ticket");
    } finally {
      setClosingTicket(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Inbox</h1>
          <p className="text-sm text-slate-500 mt-1">Reply to customer tickets and close resolved issues.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          onClick={() => fetchTickets(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden grid grid-cols-12 min-h-[70vh]">
        <aside className="col-span-4 border-r border-slate-100">
          <div className="p-4 border-b border-slate-100 text-sm font-semibold text-slate-700">Tickets</div>
          <div className="overflow-y-auto max-h-[calc(70vh-56px)] p-2">
            {loadingList ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">No support tickets found.</div>
            ) : (
              tickets.map((ticket) => {
                const isActive = ticket.id === selectedTicketId;
                const isClosed = ticket.status === "CLOSED";

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full text-left p-3 rounded-lg border mb-2 transition-colors ${
                      isActive ? "border-violet-300 bg-violet-50/40" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900 truncate">{ticket.subject}</p>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isClosed ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {ticket.user.name} · {ticket.user.email}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2">
                      {ticket._count.replies} replies · {new Date(ticket.updatedAt).toLocaleString()}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="col-span-8 flex flex-col">
          {!selectedTicket ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
              {loadingDetails ? "Loading conversation..." : "Select a ticket"}
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">{selectedTicket.subject}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedTicket.user.name} ({selectedTicket.user.email})
                  </p>
                </div>
                {selectedTicket.status === "OPEN" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCloseTicket}
                    disabled={closingTicket}
                    className="text-xs"
                  >
                    {closingTicket ? "Closing..." : "Close ticket"}
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <p className="text-xs text-slate-500 mb-1">{selectedTicket.user.name}</p>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
                {selectedTicket.replies.map((reply) => {
                  const isAdmin = reply.sender.role === "ADMIN";
                  return (
                    <div key={reply.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] p-3 rounded-xl border ${
                          isAdmin
                            ? "bg-violet-500 text-white border-violet-500"
                            : "bg-white text-slate-900 border-slate-200"
                        }`}
                      >
                        <p className={`text-xs mb-1 ${isAdmin ? "text-violet-100" : "text-slate-500"}`}>
                          {reply.sender.name}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                        <p className={`text-[11px] mt-2 ${isAdmin ? "text-violet-100" : "text-slate-400"}`}>
                          {new Date(reply.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {selectedTicket.status === "CLOSED" && (
                  <div className="flex justify-center">
                    <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1 border border-slate-200">
                      Ticket closed
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-white">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    disabled={selectedTicket.status === "CLOSED" || sendingReply}
                    placeholder={
                      selectedTicket.status === "CLOSED"
                        ? "Closed tickets cannot receive replies"
                        : "Type your reply and press Enter to send (Shift+Enter for newline)"
                    }
                    onKeyDown={async (event) => {
                      if (event.key !== "Enter" || event.shiftKey) {
                        return;
                      }

                      if (event.nativeEvent.isComposing) {
                        return;
                      }

                      event.preventDefault();
                      await handleSendReply();
                    }}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:bg-slate-100"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={selectedTicket.status === "CLOSED" || sendingReply || !replyText.trim()}
                    className="self-end"
                  >
                    {sendingReply ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminSupport;
