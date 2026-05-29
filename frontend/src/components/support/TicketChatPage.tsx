import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { useTicketStream } from "@/hooks/useTicketStream";
import api from "@/lib/api";

import { TicketHeader } from "./TicketHeader";
import { TicketInputBar } from "./TicketInputBar";
import { TicketSidebar } from "./TicketSidebar";
import { TicketThread } from "./TicketThread";
import {
  TicketDetails,
  TicketReply,
  TicketSummary,
} from "./types";
import { GuidedSupportFlow } from "./GuidedSupportFlow";

interface ApiEnvelope<TData> {
  success: boolean;
  message: string;
  data: TData;
}

interface TicketListResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  tickets: TicketSummary[];
}

interface ReplyResponse {
  ticketId: string;
  reply: TicketReply;
}

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message || fallbackMessage;
};

const addUniqueReply = (replies: TicketReply[], incomingReply: TicketReply): TicketReply[] => {
  if (replies.some((reply) => reply.id === incomingReply.id)) {
    return replies;
  }

  return [...replies, incomingReply];
};

export const TicketChatPage = (): JSX.Element => {
  const { user } = useAuth();

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetails | null>(null);
  const [showNewTicketFlow, setShowNewTicketFlow] = useState(false);
  const [recentReplyIds, setRecentReplyIds] = useState<string[]>([]);
  const [processedReplyIds, setProcessedReplyIds] = useState<string[]>([]);

  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isLoadingTicketDetails, setIsLoadingTicketDetails] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isClosingTicket, setIsClosingTicket] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const markRecentReply = (replyId: string): void => {
    setRecentReplyIds((currentIds) => {
      if (currentIds.includes(replyId)) {
        return currentIds;
      }
      return [...currentIds, replyId];
    });

    window.setTimeout(() => {
      setRecentReplyIds((currentIds) => currentIds.filter((id) => id !== replyId));
    }, 400);
  };

  const handleReplyCreated = (reply: TicketReply): void => {
    if (processedReplyIds.includes(reply.id)) {
      return;
    }

    setProcessedReplyIds((currentIds) => [...currentIds, reply.id].slice(-500));

    setSelectedTicket((currentTicket) => {
      if (!currentTicket || currentTicket.id !== reply.ticketId) {
        return currentTicket;
      }

      return {
        ...currentTicket,
        status: "OPEN",
        updatedAt: reply.createdAt,
        replies: addUniqueReply(currentTicket.replies, reply),
      };
    });

    setTickets((currentTickets) =>
      currentTickets.map((ticket) => {
        if (ticket.id !== reply.ticketId) {
          return ticket;
        }

        const nextReplyCount = ticket._count.replies + 1;
        return {
          ...ticket,
          status: "OPEN",
          updatedAt: reply.createdAt,
          _count: {
            replies: nextReplyCount,
          },
        };
      }),
    );

    markRecentReply(reply.id);
  };

  const handleTicketClosed = (): void => {
    if (!selectedTicketId) {
      return;
    }

    setSelectedTicket((currentTicket) =>
      currentTicket && currentTicket.id === selectedTicketId
        ? {
            ...currentTicket,
            status: "CLOSED",
          }
        : currentTicket,
    );

    setTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket.id === selectedTicketId
          ? {
              ...ticket,
              status: "CLOSED",
            }
          : ticket,
      ),
    );
  };

  const connectionState = useTicketStream(
    selectedTicketId,
    handleReplyCreated,
    handleTicketClosed,
  );

  const handleSendReply = async (message: string): Promise<void> => {
    if (!selectedTicketId) {
      return;
    }

    setIsSendingReply(true);
    try {
      const response = await api.post<ApiEnvelope<ReplyResponse>>(`/support/tickets/${selectedTicketId}/reply`, {
        message,
      });

      const reply = response.data.data.reply;
      handleReplyCreated(reply);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to send your reply"));
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleCloseTicketRequest = async (): Promise<void> => {
    if (!selectedTicketId || !isAdmin) {
      return;
    }

    setIsClosingTicket(true);
    try {
      await api.put(`/support/tickets/${selectedTicketId}/close`);
      handleTicketClosed();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to close this ticket"));
    } finally {
      setIsClosingTicket(false);
    }
  };

  useEffect(() => {
    const loadTickets = async (): Promise<void> => {
      setIsLoadingTickets(true);
      try {
        const response = await api.get<ApiEnvelope<TicketListResponse>>("/support/tickets?limit=100");
        const nextTickets = response.data.data.tickets || [];
        setTickets(nextTickets);

        setSelectedTicketId((currentSelectedTicketId) => {
          // showNewTicketFlow is read inside the setState updater — no stale closure
          if (nextTickets.length === 0) return null;
          if (currentSelectedTicketId && nextTickets.some((ticket) => ticket.id === currentSelectedTicketId)) {
            return currentSelectedTicketId;
          }
          return nextTickets[0]?.id ?? null;
        });
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to load support tickets"));
      } finally {
        setIsLoadingTickets(false);
      }
    };

    loadTickets();
     
  }, []);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      setRecentReplyIds([]);
      return;
    }

    const loadTicketDetails = async (): Promise<void> => {
      setIsLoadingTicketDetails(true);
      try {
        const response = await api.get<ApiEnvelope<TicketDetails>>(`/support/tickets/${selectedTicketId}`);
        setSelectedTicket(response.data.data);
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to load the selected ticket"));
        setSelectedTicket(null);
      } finally {
        setIsLoadingTicketDetails(false);
      }
    };

    loadTicketDetails();
  }, [selectedTicketId]);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="w-80 shrink-0 border-r border-[#E2E8F0] bg-white flex flex-col overflow-hidden">
        <TicketSidebar
          tickets={tickets}
          selectedTicketId={selectedTicketId}
          isLoading={isLoadingTickets}
          onSelectTicket={(id) => {
            setSelectedTicketId(id);
            setShowNewTicketFlow(false);
          }}
          onNewTicket={() => {
            setShowNewTicketFlow(true);
            setSelectedTicketId(null);
          }}
        />
      </div>

      <section className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F8FAFC]">
          {showNewTicketFlow ? (
            <GuidedSupportFlow 
              onComplete={(newTicketId) => {
                setShowNewTicketFlow(false);
                setSelectedTicketId(newTicketId);
                // Simple re-fetch to update the list, it's efficient enough for this flow
                api.get<ApiEnvelope<TicketListResponse>>("/support/tickets?limit=100")
                  .then(response => {
                    setTickets(response.data.data.tickets || []);
                  }).catch(console.error);
              }}
            />
          ) : !selectedTicketId || !selectedTicket ? (
            <div className="flex-1 flex items-center justify-center">
              {isLoadingTicketDetails ? (
                <div className="flex flex-col items-center gap-3 animate-in fade-in duration-500">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
                  <p className="text-xs font-medium text-slate-400 tracking-widest uppercase">Syncing conversation...</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white border border-[#E2E8F0]">
                    <MessageCircle className="h-8 w-8 text-[#94A3B8]" />
                  </div>
                  <p className="text-[14px] text-[#64748B]">Select a ticket to view the conversation</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <TicketHeader
                subject={selectedTicket.subject}
                status={selectedTicket.status}
                canClose={isAdmin}
                isClosing={isClosingTicket}
                connectionState={connectionState}
                onCloseTicket={handleCloseTicketRequest}
              />
              <TicketThread ticket={selectedTicket} recentReplyIds={recentReplyIds} />
              <TicketInputBar
                isClosed={selectedTicket.status === "CLOSED"}
                isSending={isSendingReply}
                onSend={handleSendReply}
              />
            </>
          )}
      </section>
    </div>
  );
};
