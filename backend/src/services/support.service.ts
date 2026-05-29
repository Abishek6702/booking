import { Prisma, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma";
import { ticketEvents } from "../lib/ticket-events";
import {
  CreateTicketInput,
  ListTicketsQueryInput,
  ReplyTicketInput,
} from "../schemas/support.schema";
import { ApiError } from "../utils/error.util";

interface TicketActor {
  id: string;
  role: UserRole;
}

export type { TicketActor };

const TicketStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;

type TicketStatusValue = (typeof TicketStatus)[keyof typeof TicketStatus];

const ticketListSelect = {
  id: true,
  userId: true,
  subject: true,
  message: true,
  attachments: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      replies: true,
    },
  },
} satisfies Prisma.TicketSelect;

const ticketReplySelect = {
  id: true,
  ticketId: true,
  senderId: true,
  message: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
} satisfies Prisma.TicketReplySelect;

const ticketDetailsSelect = {
  id: true,
  userId: true,
  subject: true,
  message: true,
  attachments: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
  replies: {
    orderBy: {
      createdAt: "asc",
    },
    select: ticketReplySelect,
  },
} satisfies Prisma.TicketSelect;

const mapTicketStatus = (status: "open" | "closed"): TicketStatusValue => {
  if (status === "closed") {
    return TicketStatus.CLOSED;
  }

  return TicketStatus.OPEN;
};

const ensureTicketId = (ticketId: string): string => {
  const id = ticketId.trim();
  if (!id) {
    throw new ApiError(400, "Invalid ticket id");
  }

  return id;
};

const ensureTicketAccess = (ticketUserId: string, actor: TicketActor): void => {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (ticketUserId !== actor.id) {
    throw new ApiError(403, "You are not allowed to access this ticket");
  }
};

const ensureSupportActionPermission = (actor: TicketActor): void => {
  if (actor.role !== UserRole.ADMIN) {
    throw new ApiError(403, "Only support team members can close tickets");
  }
};

/**
 * Verify the actor can subscribe to a ticket's SSE stream. Returns the
 * resolved ticket id so the caller can pass it straight into the event
 * subscription. Throws `ApiError(404 | 403)` on failure.
 *
 * Used by the support controller's SSE endpoint to keep Prisma access out
 * of the controller layer.
 */
export const assertTicketStreamAccess = async (
  actor: TicketActor,
  ticketId: string,
): Promise<string> => {
  const id = ensureTicketId(ticketId);

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  ensureTicketAccess(ticket.userId, actor);

  return ticket.id;
};

export const createTicket = async (userId: string, payload: CreateTicketInput) => {
  const ticket = await prisma.ticket.create({
    data: {
      userId,
      subject: payload.subject,
      message: payload.message,
      attachments: payload.attachments ?? [],
      status: TicketStatus.OPEN,
    },
    select: ticketDetailsSelect,
  });

  return ticket;
};

export const listTickets = async (actor: TicketActor, query: ListTicketsQueryInput) => {
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.TicketWhereInput = {
    ...(actor.role === UserRole.ADMIN ? {} : { userId: actor.id }),
    ...(query.status ? { status: mapTicketStatus(query.status) } : {}),
  };

  const [total, tickets] = await prisma.$transaction([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: ticketListSelect,
    }),
  ]);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
    tickets,
  };
};

export const getTicketById = async (actor: TicketActor, ticketId: string) => {
  const id = ensureTicketId(ticketId);

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: ticketDetailsSelect,
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  ensureTicketAccess(ticket.userId, actor);

  return ticket;
};

export const replyToTicket = async (actor: TicketActor, ticketId: string, payload: ReplyTicketInput) => {
  const id = ensureTicketId(ticketId);

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!ticket) {
      throw new ApiError(404, "Ticket not found");
    }

    ensureTicketAccess(ticket.userId, actor);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new ApiError(400, "Closed tickets cannot receive replies");
    }

    const reply = await tx.ticketReply.create({
      data: {
        ticketId: ticket.id,
        senderId: actor.id,
        message: payload.message,
      },
      select: ticketReplySelect,
    });

    return {
      ticketId: ticket.id,
      reply,
    };
  });

  ticketEvents.emit("reply:created", {
    ticketId: result.ticketId,
    reply: result.reply,
  });

  return result;
};

export const closeTicket = async (actor: TicketActor, ticketId: string) => {
  const id = ensureTicketId(ticketId);
  ensureSupportActionPermission(actor);

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
    },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  ensureTicketAccess(ticket.userId, actor);

  if (ticket.status === TicketStatus.CLOSED) {
    return {
      id: ticket.id,
      status: ticket.status,
      closedAt: null,
    };
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: TicketStatus.CLOSED,
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });

  ticketEvents.emit("ticket:closed", { ticketId: updated.id });

  return {
    id: updated.id,
    status: updated.status,
    closedAt: updated.updatedAt,
  };
};
