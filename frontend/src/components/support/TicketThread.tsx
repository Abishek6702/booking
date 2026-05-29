import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

import { TicketDetails, TicketReply } from "./types";

interface TicketThreadProps {
  ticket: TicketDetails;
  recentReplyIds: string[];
}

const formatTimestamp = (value: string): string => {
  return new Date(value).toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
};

const ReplyBubble = ({
  reply,
  isRecent,
}: {
  reply: TicketReply;
  isRecent: boolean;
}): JSX.Element => {
  const { user } = useAuth();
  const isAdminMessage = reply.sender.role === "ADMIN";
  const isMyMessage = reply.senderId === user?.id;
  
  const wrapperClassName = isMyMessage ? "justify-end" : "justify-start";
  const bubbleClassName = isMyMessage
    ? "bg-[#0F172A] text-white rounded-[16px] rounded-br-[4px] border-[#0F172A]"
    : "bg-white text-slate-900 rounded-[16px] rounded-bl-[4px] border-[#E2E8F0]";

  return (
    <div className={`w-full flex ${wrapperClassName} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className={`max-w-[70%] ${isRecent ? "animate-ticket-fade-up" : ""}`}>
        <p className={`mb-1 text-xs text-[#64748B] ${isMyMessage ? "text-right" : "text-left"}`}>
          {isAdminMessage ? "Support team" : reply.sender.name}
        </p>
        <div className={`border px-4 py-3 ${bubbleClassName} shadow-sm transition-all hover:shadow-md`}>
          <p className="whitespace-pre-wrap break-words text-sm">{reply.message}</p>
        </div>
        <p className={`mt-1 text-xs text-[#94A3B8] ${isMyMessage ? "text-right" : "text-left"}`}>
          {formatTimestamp(reply.createdAt)}
        </p>
      </div>
    </div>
  );
};

export const TicketThread = ({ ticket, recentReplyIds }: TicketThreadProps): JSX.Element => {
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!threadRef.current) {
      return;
    }

    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [ticket.id, ticket.replies.length, ticket.status]);

  const { user } = useAuth();
  const isOriginalMessageMine = ticket.userId === user?.id;

  return (
    <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto bg-[#F8FAFC] px-5 py-6 scroll-smooth">
      <p className={`text-[11px] font-medium uppercase tracking-widest text-[#94A3B8] ${isOriginalMessageMine ? "text-right" : "text-left"}`}>
        Original message
      </p>
      <div className={`w-full flex ${isOriginalMessageMine ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both`}>
        <div className="max-w-[70%]">
          <p className={`mb-1 text-xs font-medium text-[#64748B] ${isOriginalMessageMine ? "text-right" : "text-left"}`}>
            {ticket.user.name}
          </p>
          <div className={`rounded-[16px] ${isOriginalMessageMine ? "rounded-br-[4px] bg-[#0F172A] text-white border-[#0F172A]" : "rounded-bl-[4px] bg-white border-[#E2E8F0] text-[#1E293B]"} border px-4 py-3 shadow-sm transition-all hover:shadow-md`}>
            <p className="whitespace-pre-wrap break-words text-sm">{ticket.message}</p>
          </div>
          <p className={`mt-1 text-xs text-[#94A3B8] ${isOriginalMessageMine ? "text-right" : "text-left"}`}>{formatTimestamp(ticket.createdAt)}</p>
        </div>
      </div>

      {ticket.replies.map((reply) => (
        <ReplyBubble key={reply.id} reply={reply} isRecent={recentReplyIds.includes(reply.id)} />
      ))}

      {ticket.status === "CLOSED" && (
        <div className="flex justify-center">
          <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
            Ticket closed
          </span>
        </div>
      )}
    </div>
  );
};
