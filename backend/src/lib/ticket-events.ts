import { EventEmitter } from "node:events";
import { UserRole } from "@prisma/client";

export interface TicketReplyStreamPayload {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  createdAt: Date;
  sender: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export interface ReplyCreatedEventPayload {
  ticketId: string;
  reply: TicketReplyStreamPayload;
}

export interface TicketClosedEventPayload {
  ticketId: string;
}

interface TicketEventMap {
  "reply:created": ReplyCreatedEventPayload;
  "ticket:closed": TicketClosedEventPayload;
}

class TicketEvents extends EventEmitter {
  public emit<EventName extends keyof TicketEventMap>(
    eventName: EventName,
    payload: TicketEventMap[EventName],
  ): boolean {
    return super.emit(eventName, payload);
  }

  public on<EventName extends keyof TicketEventMap>(
    eventName: EventName,
    listener: (payload: TicketEventMap[EventName]) => void,
  ): this {
    return super.on(eventName, listener);
  }

  public off<EventName extends keyof TicketEventMap>(
    eventName: EventName,
    listener: (payload: TicketEventMap[EventName]) => void,
  ): this {
    return super.off(eventName, listener);
  }
}

export const ticketEvents = new TicketEvents();
ticketEvents.setMaxListeners(0);
