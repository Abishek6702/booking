import { z } from "zod";

/**
 * Centralized pagination conventions for the modular monolith.
 *
 * Existing modules (admin, search, support) use `{ page, limit, total,
 * totalPages, <items> }`. New paginated endpoints SHOULD follow that shape
 * so clients can consume them uniformly.
 *
 * Use `paginationQuerySchema` inside Zod request schemas:
 *   z.object({
 *     query: paginationQuerySchema.extend({ status: ... }),
 *   })
 *
 * Use `parsePagination(input)` inside a service to derive `skip`/`take`
 * with safe defaults when the caller did not pass any params.
 *
 * Use `buildPaginationMeta(query, total)` to format the metadata block.
 */

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

/**
 * Standard pagination query: `?page=1&limit=20`. `coerce` is used so
 * Express query strings (always strings) are converted to numbers.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_LIMIT)
    .default(DEFAULT_PAGE_LIMIT),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface ResolvedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/**
 * Resolve a partial / loose pagination input into safe values. Use in
 * services where the caller may not have pre-validated through Zod.
 */
export const parsePagination = (input?: {
  page?: number;
  limit?: number;
}): ResolvedPagination => {
  const rawPage = Number(input?.page ?? 1);
  const rawLimit = Number(input?.limit ?? DEFAULT_PAGE_LIMIT);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limitFloor = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.floor(rawLimit) : DEFAULT_PAGE_LIMIT;
  const limit = Math.min(limitFloor, MAX_PAGE_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const buildPaginationMeta = (
  pagination: { page: number; limit: number },
  total: number,
): PaginationMeta => {
  const totalPages = pagination.limit > 0 ? Math.ceil(total / pagination.limit) : 0;

  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
};

/**
 * Convenience: pull `page` and `limit` from an Express `req.query`-shaped
 * object and return a clean object suitable for passing to a paginated
 * service. Values that aren't present or aren't valid numbers are omitted
 * (NOT set to `undefined`) so it composes cleanly with strict
 * `exactOptionalPropertyTypes`.
 */
export const paginationFromQuery = (
  query: Record<string, unknown>,
): { page?: number; limit?: number } => {
  const out: { page?: number; limit?: number } = {};

  if (query.page !== undefined) {
    const parsed = Number(query.page);
    if (Number.isFinite(parsed)) out.page = parsed;
  }

  if (query.limit !== undefined) {
    const parsed = Number(query.limit);
    if (Number.isFinite(parsed)) out.limit = parsed;
  }

  return out;
};
