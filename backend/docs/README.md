# TravelMate Backend — API Documentation Index

> **Base URL:** `/api`  
> **Auth:** Most protected endpoints require `Authorization: Bearer <accessToken>`  
> **Stack:** Express + TypeScript + Zod validation + Prisma ORM

---

## Module Documentation

| Module | File | Base Path | Description |
|--------|------|-----------|-------------|
| Authentication | [auth-endpoints.md](./auth-endpoints.md) | `/api/auth` | Register, login, logout, token refresh, email verification, password reset |
| User / Profile | [user-endpoints.md](./user-endpoints.md) | `/api/auth` + `/api/profile` | Current user, profile management, bookings, favorites |
| Stays | [stays-endpoints.md](./stays-endpoints.md) | `/api/stays` | Search, view, create, update, delete stay properties |
| Rooms | [rooms-endpoints.md](./rooms-endpoints.md) | `/api/stays/:id/rooms` | Room management nested under stays |
| Vehicles | [vehicles-endpoints.md](./vehicles-endpoints.md) | `/api/vehicles` | Search, view, create, update, delete vehicles |
| Attractions | [attractions-endpoints.md](./attractions-endpoints.md) | `/api/attractions` | Experiences/activities with slot-based booking |
| Bookings | [bookings-endpoints.md](./bookings-endpoints.md) | `/api/bookings` | Preview, create, update, cancel, and view bookings |
| Payments | [payments-endpoints.md](./payments-endpoints.md) | `/api/payments` | Process payments, view history, request refunds |
| Reviews | [reviews-endpoints.md](./reviews-endpoints.md) | `/api/reviews` | Submit, update, delete, and vote on reviews |
| Support | [support-endpoints.md](./support-endpoints.md) | `/api/support` | Support ticket creation, messaging, and resolution |
| Owner | [owner-endpoints.md](./owner-endpoints.md) | `/api/owner` | Owner dashboard, analytics, and verification |
| Admin | [admin-endpoints.md](./admin-endpoints.md) | `/api/admin` | Platform-wide management, approvals, and moderation |
| Upload | [upload-endpoints.md](./upload-endpoints.md) | `/api/upload` | Single and batch file upload (CDN) |

---

## Consolidated Missing Endpoints Summary

The table below lists all endpoints identified as missing across modules.

| Module | Suggested Endpoint | Reason |
|--------|--------------------|--------|
| Auth | `POST /api/auth/change-password` | Authenticated password change without reset flow |
| Auth | `POST /api/auth/revoke-sessions` | Log out from all devices |
| User/Profile | `PATCH /api/profile/avatar` | Link uploaded image URL to the user's profile |
| Stays | `GET /api/stays/featured` | Featured listings for homepage |
| Stays | `GET /api/stays/:id/reviews` | Shortcut instead of querying `/api/reviews?itemId=&itemType=stay` |
| Rooms | `GET /api/stays/:id/rooms/:roomId` | Fetch a single room by ID |
| Rooms | `GET /api/stays/:id/rooms/:roomId/availability` | Per-room availability check |
| Vehicles | `GET /api/vehicles/featured` | Featured vehicles for homepage |
| Vehicles | `GET /api/vehicles/:id/reviews` | Review shortcut for vehicles |
| Vehicles | `PATCH /api/vehicles/:id/location` | Live location update without full PUT |
| Attractions | `GET /api/attractions/featured` | Featured attractions for homepage |
| Attractions | `GET /api/attractions/:id/reviews` | Review shortcut for attractions |
| Attractions | `PATCH /api/attractions/:id/slots/:slotId/toggle` | Enable/disable a slot |
| Bookings | `GET /api/bookings/` | User's own booking list (currently via profile) |
| Bookings | `GET /api/bookings/owner?status=` | Filter owner bookings by status |
| Payments | `GET /api/payments/?page=&limit=` | Paginated payment history |
| Payments | `GET /api/payments/owner/earnings` | Owner earnings and payouts |
| Payments | `GET /api/payments/:id/receipt` | Downloadable receipt |
| Reviews | `GET /api/reviews/:id` | Fetch a single review |
| Reviews | `GET /api/reviews/me` | User's own reviews |
| Reviews | `POST /api/reviews/:id/report` | Flag inappropriate reviews |
| Support | `PUT /api/support/tickets/:id/reopen` | Reopen a closed ticket |
| Support | `POST /api/support/tickets/:id/attachments` | Add file attachments to tickets |
| Owner | `PUT /api/owner/verification/resubmit` | Resubmit after rejection |
| Owner | `GET /api/owner/payouts` | Earnings/payout history |
| Owner | `GET /api/owner/notifications` | Owner-specific notifications |
| Admin | `DELETE /api/admin/reviews/:id` | Remove inappropriate reviews |
| Admin | `DELETE /api/admin/users/:id` | Ban/soft-delete a user |
| Admin | `GET /api/admin/support/tickets` | Platform-wide ticket management |
| Admin | `GET /api/admin/payments` | Platform-wide payment overview |
| Admin | `GET /api/admin/stats` | Platform statistics dashboard |
| Upload | `DELETE /api/upload/:fileKey` | Delete orphaned uploaded files |
| Upload | `GET /api/upload/` | List user's uploaded files |