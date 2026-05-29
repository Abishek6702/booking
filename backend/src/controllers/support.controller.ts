import { Request, Response } from "express";

import {
  ReplyCreatedEventPayload,
  TicketClosedEventPayload,
  ticketEvents,
} from "../lib/ticket-events";
import {
  closeTicketSchema,
  createTicketSchema,
  getTicketByIdSchema,
  listTicketsSchema,
  replyTicketSchema,
} from "../schemas/support.schema";
import * as supportService from "../services/support.service";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";

const requireActor = (req: Request) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  return {
    id: req.user.id,
    role: req.user.role,
  };
};

export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const payload = createTicketSchema.shape.body.parse(req.body);
  const data = await supportService.createTicket(actor.id, payload);

  sendSuccess(res, "Support ticket created successfully", data, 201);
});

export const listTickets = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const query = listTicketsSchema.shape.query.parse(req.query);
  const data = await supportService.listTickets(actor, query);

  sendSuccess(res, "Support tickets fetched successfully", data);
});

export const getTicketById = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const { id } = getTicketByIdSchema.shape.params.parse(req.params);
  const data = await supportService.getTicketById(actor, id);

  sendSuccess(res, "Support ticket fetched successfully", data);
});

export const replyToTicket = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const { id } = replyTicketSchema.shape.params.parse(req.params);
  const payload = replyTicketSchema.shape.body.parse(req.body);
  const data = await supportService.replyToTicket(actor, id, payload);

  sendSuccess(res, "Support ticket reply added successfully", data, 201);
});

export const closeTicket = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const { id } = closeTicketSchema.shape.params.parse(req.params);
  const data = await supportService.closeTicket(actor, id);

  sendSuccess(res, "Support ticket closed successfully", data);
});

export const streamTicket = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const { id } = getTicketByIdSchema.shape.params.parse(req.params);

  // Ownership / access check lives in the service. Throws ApiError(404|403)
  // and propagates through the central errorHandler if denied.
  const ticketId = await supportService.assertTicketStreamAccess(actor, id);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const pingInterval = setInterval(() => {
    res.write(": ping\n\n");
  }, 25_000);

  const handleReplyCreated = (payload: ReplyCreatedEventPayload): void => {
    if (payload.ticketId !== ticketId) {
      return;
    }

    res.write(
      `data: ${JSON.stringify({
        type: "reply",
        reply: payload.reply,
      })}\n\n`,
    );
  };

  const handleTicketClosed = (payload: TicketClosedEventPayload): void => {
    if (payload.ticketId !== ticketId) {
      return;
    }

    res.write(`data: ${JSON.stringify({ type: "closed" })}\n\n`);
  };

  ticketEvents.on("reply:created", handleReplyCreated);
  ticketEvents.on("ticket:closed", handleTicketClosed);

  req.on("close", () => {
    clearInterval(pingInterval);
    ticketEvents.off("reply:created", handleReplyCreated);
    ticketEvents.off("ticket:closed", handleTicketClosed);

    if (!res.writableEnded) {
      res.end();
    }
  });
});
