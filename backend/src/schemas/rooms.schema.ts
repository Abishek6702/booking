import { z } from "zod";

const roomBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  pricePerNight: z.coerce.number().positive(),
  maxGuests: z.coerce.number().int().min(1),
  bedType: z.string().trim().min(1),
  amenities: z.array(z.string().trim().min(1)).max(100).optional(),
  options: z.any().optional(),
});

export const stayParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const stayRoomParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
    roomId: z.string().trim().min(1),
  }),
});

export const createRoomSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: roomBodySchema,
});

export const updateRoomSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
    roomId: z.string().trim().min(1),
  }),
  body: roomBodySchema,
});

export const roomAvailabilitySchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
    roomId: z.string().trim().min(1),
  }),
  query: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>["body"];
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>["body"];
export type RoomAvailabilityQueryInput = z.infer<typeof roomAvailabilitySchema>["query"];
