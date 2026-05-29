export type TicketStatus = "OPEN" | "CLOSED";

export interface TicketSummary {
  id: string;
  userId: string;
  subject: string;
  message: string;
  attachments: string[];
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  _count: {
    replies: number;
  };
}

export interface TicketSender {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "OWNER" | "ADMIN";
}

export interface TicketReply {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  createdAt: string;
  sender: TicketSender;
}

export interface TicketDetails {
  id: string;
  userId: string;
  subject: string;
  message: string;
  attachments: string[];
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  user: TicketSender;
  replies: TicketReply[];
}

export type TicketStreamConnectionState = "connected" | "reconnecting";
