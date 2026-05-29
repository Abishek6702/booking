# User Endpoints

> **Base URL:** `/api/v1`
> **Auth:** Endpoints marked 🔒 require a valid Bearer token (`Authorization: Bearer <accessToken>`).
> **Rate-limited:** All auth endpoints are protected by `authRateLimiter`.

---

## Existing Endpoints

---

## 1. Register

**Purpose:** Create a new user account (customer or owner). Returns an access token and refresh token on success.

- **Method:** `POST`
- **Route:** `/api/v1/auth/register`
- **Auth:** None

### Request Body

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+919876543210",
  "password": "Secret@123",
  "role": "customer"
}
```

> `phone` is optional. `role` defaults to `"customer"`; accepted values: `"customer"` | `"owner"`.
> Password rules: min 8, max 72 chars; must include uppercase, lowercase, and a digit.

### Response

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<token>"
  }
}
```

---

## 2. Login

**Purpose:** Authenticate an existing user with email and password. Returns a fresh access token and refresh token.

- **Method:** `POST`
- **Route:** `/api/v1/auth/login`
- **Auth:** None

### Request Body

```json
{
  "email": "user@example.com",
  "password": "Secret@123"
}
```

### Response

```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<token>"
  }
}
```

---

## 3. Get Current User (Me)

**Purpose:** Fetch the authenticated user's basic identity details from the access token.

- **Method:** `GET`
- **Route:** `/api/v1/auth/me`
- **Auth:** 🔒 Bearer token

### Request Body / Params

```json
{}
```

### Response

```json
{
  "success": true,
  "message": "Current user fetched successfully",
  "data": {
    "id": "clxyz...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer"
  }
}
```

---

## 4. Refresh Token

**Purpose:** Exchange a valid refresh token for a new access token (and optionally a new refresh token).

- **Method:** `POST`
- **Route:** `/api/v1/auth/refresh`
- **Auth:** None

### Request Body

```json
{
  "refreshToken": "<refresh_token_string>"
}
```

### Response

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "<new_jwt>",
    "refreshToken": "<new_refresh_token>"
  }
}
```

---

## 5. Logout

**Purpose:** Invalidate the provided refresh token, effectively logging the user out.

- **Method:** `POST`
- **Route:** `/api/v1/auth/logout`
- **Auth:** None (refresh token self-identifies the session)

### Request Body

```json
{
  "refreshToken": "<refresh_token_string>"
}
```

> `refreshToken` is optional — omitting it performs a best-effort logout.

### Response

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {}
}
```

---

## 6. Forgot Password

**Purpose:** Trigger a password-reset email to the given address. Always responds with a generic message to prevent user enumeration.

- **Method:** `POST`
- **Route:** `/api/v1/auth/forgot-password`
- **Auth:** None

### Request Body

```json
{
  "email": "user@example.com"
}
```

### Response

```json
{
  "success": true,
  "message": "If an account exists for that email, a reset link has been issued",
  "data": {}
}
```

---

## 7. Reset Password

**Purpose:** Set a new password using the one-time token sent via the forgot-password email.

- **Method:** `POST`
- **Route:** `/api/v1/auth/reset-password`
- **Auth:** None

### Request Body

```json
{
  "token": "<reset_token_from_email>",
  "password": "NewSecret@456"
}
```

> Password rules: same as registration (min 8, max 72, uppercase + lowercase + digit).

### Response

```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {}
}
```

---

## 8. Verify Email

**Purpose:** Confirm the user's email address using the token sent in the verification email.

- **Method:** `POST`
- **Route:** `/api/v1/auth/verify-email`
- **Auth:** None

### Request Body

```json
{
  "token": "<email_verification_token>"
}
```

### Response

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {}
}
```

---

## 9. Resend Verification Email

**Purpose:** Dispatch a new email verification link for the currently authenticated (but unverified) user.

- **Method:** `POST`
- **Route:** `/api/v1/auth/resend-verification`
- **Auth:** 🔒 Bearer token

### Request Body / Params

```json
{}
```

### Response

```json
{
  "success": true,
  "message": "Verification email dispatched",
  "data": {}
}
```

---

## 10. Get Profile

**Purpose:** Retrieve the full profile of the authenticated user, including membership tier and lifetime spend.

- **Method:** `GET`
- **Route:** `/api/v1/profile`
- **Auth:** 🔒 Bearer token

### Request Body / Params

```json
{}
```

### Response

```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "id": "clxyz...",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+919876543210",
    "role": "customer",
    "membershipTier": "SILVER",
    "lifetimeSpend": 12500.00,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-06-01T00:00:00.000Z"
  }
}
```

---

## 11. Update Profile

**Purpose:** Update the authenticated user's mutable profile fields (`name` and/or `phone`). At least one field must be provided.

- **Method:** `PUT`
- **Route:** `/api/v1/profile`
- **Auth:** 🔒 Bearer token

### Request Body

```json
{
  "name": "Jane Doe",
  "phone": "+911234567890"
}
```

> Both fields are optional but at least one must be present. Set `phone` to `null` to remove it.

### Response

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "clxyz...",
    "email": "user@example.com",
    "name": "Jane Doe",
    "phone": "+911234567890",
    "role": "customer",
    "membershipTier": "SILVER",
    "lifetimeSpend": 12500.00,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-04-25T05:30:00.000Z"
  }
}
```

---

## 12. Delete Account

**Purpose:** Permanently delete the authenticated user's account and all associated data from the database.

- **Method:** `DELETE`
- **Route:** `/api/v1/profile`
- **Auth:** 🔒 Bearer token

### Request Body / Params

```json
{}
```

### Response

```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": {}
}
```

---

## 13. Get My Bookings

**Purpose:** Retrieve a paginated list of all bookings made by the authenticated user across stays, vehicles, and attractions.

- **Method:** `GET`
- **Route:** `/api/v1/profile/bookings`
- **Auth:** 🔒 Bearer token

### Request Params (Query String)

```json
{
  "page": 1,
  "limit": 10
}
```

> `page` ≥ 1 (default: 1). `limit` between 1–100 (default: 10).

### Response

```json
{
  "success": true,
  "message": "Bookings fetched successfully",
  "data": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "bookings": [
      {
        "id": "bk_001",
        "userId": "clxyz...",
        "stayId": "stay_001",
        "roomId": "room_001",
        "vehicleId": null,
        "attractionId": null,
        "slotId": null,
        "vehicleServiceMode": null,
        "pickupAddress": null,
        "dropoffAddress": null,
        "type": "STAY",
        "checkIn": "2025-07-10T00:00:00.000Z",
        "checkOut": "2025-07-15T00:00:00.000Z",
        "guests": 2,
        "guestDetails": {},
        "totalPrice": 8500.00,
        "status": "CONFIRMED",
        "createdAt": "2025-06-20T10:00:00.000Z",
        "updatedAt": "2025-06-20T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 14. Toggle Favorite

**Purpose:** Add or remove an item (stay, vehicle, or attraction) from the user's favorites list. Acts as a toggle — calling it twice on the same item removes it.

- **Method:** `POST`
- **Route:** `/api/v1/profile/favorites`
- **Auth:** 🔒 Bearer token

### Request Body

```json
{
  "itemId": "stay_001",
  "itemType": "stay"
}
```

> `itemType` accepted values: `"stay"` | `"vehicle"` | `"attraction"`.

### Response

```json
{
  "success": true,
  "message": "Favorite updated successfully",
  "data": {
    "action": "added",
    "favorite": {
      "id": "fav_001",
      "userId": "clxyz...",
      "itemId": "stay_001",
      "itemType": "STAY",
      "createdAt": "2026-04-25T05:30:00.000Z"
    }
  }
}
```

> `action` will be `"added"` or `"removed"` depending on prior state.

---

## 15. Get My Favorites

**Purpose:** Retrieve all items the authenticated user has favorited, sorted by most recently added.

- **Method:** `GET`
- **Route:** `/api/v1/profile/favorites`
- **Auth:** 🔒 Bearer token

### Request Body / Params

```json
{}
```

### Response

```json
{
  "success": true,
  "message": "Favorites fetched successfully",
  "data": [
    {
      "id": "fav_001",
      "userId": "clxyz...",
      "itemId": "stay_001",
      "itemType": "STAY",
      "createdAt": "2026-04-25T05:30:00.000Z"
    }
  ]
}
```

---

## Missing Endpoints

The following endpoints are standard in a production user system but are **not yet implemented** in the codebase:

---

## M1. Change Password

**Purpose:** Allow an authenticated user to change their password by providing the current password for verification.

- **Method:** `PUT` / `PATCH`
- **Route:** `/api/v1/profile/change-password` *(suggested)*
- **Auth:** 🔒 Bearer token

### Request Body

```json
{
  "currentPassword": "OldSecret@123",
  "newPassword": "NewSecret@456"
}
```

### Response

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {}
}
```

> ⚠️ **Gap:** Currently only `name` and `phone` can be updated via profile. Password changes require going through the forgot/reset password flow (unauthenticated). A dedicated in-session change-password endpoint is absent.

---

## M2. Upload / Update Avatar

**Purpose:** Allow the user to upload or replace their profile picture.

- **Method:** `POST` / `PATCH`
- **Route:** `/api/v1/profile/avatar` *(suggested)*
- **Auth:** 🔒 Bearer token

### Request Body

```json
{
  "avatarUrl": "https://cdn.example.com/avatars/user123.jpg"
}
```

> An `/api/v1/upload` route exists, but there is no dedicated endpoint to link the uploaded URL back to the user's profile record.

### Response

```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "avatarUrl": "https://cdn.example.com/avatars/user123.jpg"
  }
}
```

---

## Summary Table

| # | Endpoint Name | Method | Route | Auth | Status |
|---|---------------|--------|-------|------|--------|
| 1 | Register | `POST` | `/api/v1/auth/register` | None | ✅ Exists |
| 2 | Login | `POST` | `/api/v1/auth/login` | None | ✅ Exists |
| 3 | Get Current User | `GET` | `/api/v1/auth/me` | 🔒 | ✅ Exists |
| 4 | Refresh Token | `POST` | `/api/v1/auth/refresh` | None | ✅ Exists |
| 5 | Logout | `POST` | `/api/v1/auth/logout` | None | ✅ Exists |
| 6 | Forgot Password | `POST` | `/api/v1/auth/forgot-password` | None | ✅ Exists |
| 7 | Reset Password | `POST` | `/api/v1/auth/reset-password` | None | ✅ Exists |
| 8 | Verify Email | `POST` | `/api/v1/auth/verify-email` | None | ✅ Exists |
| 9 | Resend Verification Email | `POST` | `/api/v1/auth/resend-verification` | 🔒 | ✅ Exists |
| 10 | Get Profile | `GET` | `/api/v1/profile` | 🔒 | ✅ Exists |
| 11 | Update Profile | `PUT` | `/api/v1/profile` | 🔒 | ✅ Exists |
| 12 | Delete Account | `DELETE` | `/api/v1/profile` | 🔒 | ✅ Exists |
| 13 | Get My Bookings | `GET` | `/api/v1/profile/bookings` | 🔒 | ✅ Exists |
| 14 | Toggle Favorite | `POST` | `/api/v1/profile/favorites` | 🔒 | ✅ Exists |
| 15 | Get My Favorites | `GET` | `/api/v1/profile/favorites` | 🔒 | ✅ Exists |
| M1 | Change Password | `PUT` | `/api/v1/profile/change-password` | 🔒 | ❌ Missing |
| M2 | Upload Avatar | `POST` | `/api/v1/profile/avatar` | 🔒 | ❌ Missing |
