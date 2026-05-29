import { useEffect, useRef, useState } from "react";

import api from "@/lib/api";
import {
  TicketReply,
  TicketStreamConnectionState,
} from "@/components/support/types";

interface ReplyStreamMessage {
  type: "reply";
  reply: TicketReply;
}

interface ClosedStreamMessage {
  type: "closed";
}

type StreamMessage = ReplyStreamMessage | ClosedStreamMessage;

const buildTicketStreamUrl = (ticketId: string): string => {
  const apiBaseUrl = String(api.defaults.baseURL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1");
  const origin = apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  const streamUrl = new URL(`/api/v1/support/tickets/${ticketId}/stream`, origin);

  const accessToken = window.localStorage.getItem("tm_accessToken");
  if (accessToken) {
    streamUrl.searchParams.set("accessToken", accessToken);
  }

  return streamUrl.toString();
};

export const useTicketStream = (
  ticketId: string | null,
  onReply: (reply: TicketReply) => void,
  onClosed: () => void,
): TicketStreamConnectionState => {
  const [connectionState, setConnectionState] = useState<TicketStreamConnectionState>("reconnecting");
  const onReplyRef = useRef(onReply);
  const onClosedRef = useRef(onClosed);

  useEffect(() => {
    onReplyRef.current = onReply;
    onClosedRef.current = onClosed;
  }, [onReply, onClosed]);

  useEffect(() => {
    if (!ticketId) {
      setConnectionState("reconnecting");
      return;
    }

    const streamUrl = buildTicketStreamUrl(ticketId);
    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    eventSource.onopen = () => {
      setConnectionState("connected");
    };

    eventSource.onerror = () => {
      setConnectionState("reconnecting");
    };

    eventSource.onmessage = (event: MessageEvent<string>) => {
      if (!event.data) {
        return;
      }

      try {
        const payload = JSON.parse(event.data) as StreamMessage;
        if (payload.type === "reply") {
          onReplyRef.current(payload.reply);
          return;
        }

        if (payload.type === "closed") {
          onClosedRef.current();
        }
      } catch {
        // Ignore malformed stream messages.
      }
    };

    return () => {
      eventSource.close();
      setConnectionState("reconnecting");
    };
  }, [ticketId]);

  return connectionState;
};
