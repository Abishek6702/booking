import { z } from "zod";

const ticketStatusSchema = z.enum(["open", "closed"]);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const ticketIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const ticketAttachmentsSchema = z.array(z.string().url().max(2048)).max(5);

export const createTicketSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(3).max(200),
    message: z.string().trim().min(1).max(5000),
    attachments: ticketAttachmentsSchema.optional(),
  }),
});

export const listTicketsSchema = z.object({
  query: paginationSchema.extend({
    status: ticketStatusSchema.optional(),
  }),
});

export const getTicketByIdSchema = z.object({
  params: ticketIdParamsSchema,
});

export const replyTicketSchema = z.object({
  params: ticketIdParamsSchema,
  body: z.object({
    message: z.string().trim().min(1).max(5000),
  }),
});

export const closeTicketSchema = z.object({
  params: ticketIdParamsSchema,
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>["body"];
export type ListTicketsQueryInput = z.infer<typeof listTicketsSchema>["query"];
export type ReplyTicketInput = z.infer<typeof replyTicketSchema>["body"];
