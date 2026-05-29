# Backend Required Changes (Non-Microservice)

This file lists what needs to be changed in backend code to follow the backend/database rule docs, excluding microservice requirements.

## 1. High-Priority Fixes

1. **Ride status update must use domain state machine**
   - File: `src/controllers/rides.controller.ts`
   - Problem: Direct DB updates allow invalid transitions and actor violations.
   - Change needed: Route all status changes through `ride-lifecycle.service.ts` transition logic.

2. **Move ride controller business logic to service layer**
   - File: `src/controllers/rides.controller.ts`
   - Problem: Controller contains heavy query/business logic.
   - Change needed: Controller should only parse request + call service + return response.

3. **Add request validation for rides endpoints**
   - Files: `src/routes/rides.routes.ts`, `src/schemas/*`
   - Problem: Missing Zod validation for ride params/body.
   - Change needed: Add schemas and `validateRequest(...)` on all rides endpoints.

4. **Driver status endpoints should not contain inline route business logic**
   - File: `src/routes/driver.routes.ts`
   - Problem: Inline logic bypasses controller/service layering.
   - Change needed: Move to dedicated controller + service; validate request body via schema.

5. **Remove duplicate/legacy ride-flow logic from bookings service**
   - File: `src/services/bookings.service.ts`
   - Problem: Contains old ride action methods that duplicate `ride-lifecycle.service.ts`.
   - Change needed: Keep one source of truth for ride lifecycle transitions.

## 2. Security and Reliability Fixes

1. **Do not silently swallow notification persistence failures**
   - File: `src/services/notification.service.ts`
   - Problem: Broad try/catch logs and hides failure.
   - Change needed: Surface failure or return explicit result/error contract.

2. **Avoid logging raw user location data**
   - File: `src/services/maps.service.ts`
   - Problem: Logs pickup/dropoff strings directly (PII risk).
   - Change needed: Log minimal metadata only (hashed/masked/generalized).

3. **Use consistent error handling path**
   - Files: `src/controllers/rides.controller.ts`, `src/routes/driver.routes.ts`
   - Problem: Mixed direct `res.status(...).json(...)` and centralized `ApiError`.
   - Change needed: Prefer centralized `ApiError` + global `errorHandler`.

## 3. API Contract and Validation Consistency

1. **Enforce role/ownership consistently for driver-only actions**
   - Files: `src/routes/rides.routes.ts`, `src/controllers/rides.controller.ts`
   - Change needed: Ensure only assigned driver can mutate ride status.

2. **Ensure status enum exposure matches business rules**
   - Files: ride schemas + controllers/services
   - Problem: Driver endpoint can currently accept statuses that should be customer/system-only.
   - Change needed: Restrict accepted statuses by actor.

3. **Keep response format consistent**
   - Rule: `{ success, message, data }`
   - Change needed: Keep structured responses consistent across all backend modules.

## 4. Integration Tasks

1. Wire newly created modules into routes:
   - `src/schemas/rides.schema.ts`
   - `src/schemas/driver.schema.ts`
   - `src/services/rides.service.ts`
   - `src/services/driver.service.ts`
   - `src/controllers/driver.controller.ts`

2. Update `rides` and `driver` routes to use those modules.

3. Remove obsolete ride methods from `bookings.service.ts` once routing is fully migrated.

## 5. Validation and Completion

After code updates:

1. `npm run typecheck`
2. `npm run prisma:validate`
3. `npm run test:e2e`

All must pass without introducing schema/contract regressions.

