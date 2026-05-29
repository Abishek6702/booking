# Auth Endpoints

Base path: `/api/auth`

All endpoints in this module are subject to a **rate limiter** (`authRateLimiter`).

---

## 1. Register

**Purpose:** Create a new user account.

| Field  | Value                  |
|--------|------------------------|
| Method | `POST`                 |
| Route  | `/api/auth/register`   |
| Auth   | None                   |

### Request Body

```json
{
  "email": "user@example.com",
  "name": "Jane Doe",
  "phone": "+911234567890",
  "password": "StrongPass1",
  "role": "customer"
}
```

| Field      | Type     | Required | Notes                                           |
|------------|----------|----------|-------------------------------------------------|
| `email`    | string   | ✅       | Valid email, lowercased on save                 |
| `name`     | string   | ✅       | 2–100 characters                                |
| `phone`    | string   | ❌       | 7–20 characters                                 |
| `password` | string   | ✅       | Min 8 chars, must include upper, lower, number  |
| `role`     | string   | ❌       | `"customer"` (default) or `"owner"`             |

### Response `201`

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "customer"
  }
}
```

---

## 2. Login

**Purpose:** Authenticate an existing user and return access/refresh tokens.

| Field  | Value               |
|--------|---------------------|
| Method | `POST`              |
| Route  | `/api/auth/login`   |
| Auth   | None                |

### Request Body

```json
{
  "email": "user@example.com",
  "password": "StrongPass1"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "user_abc123",
      "email": "user@example.com",
      "name": "Jane Doe",
      "role": "customer"
    }
  }
}
```

---

## 3. Get Current User

**Purpose:** Return the authenticated user's profile.

| Field  | Value               |
|--------|---------------------|
| Method | `GET`               |
| Route  | `/api/auth/me`      |
| Auth   | `Bearer <token>` ✅ |

### Response `200`

```json
{
  "success": true,
  "message": "Current user fetched successfully",
  "data": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "customer",
    "emailVerified": true
  }
}
```

---

## 4. Refresh Token

**Purpose:** Exchange a valid refresh token for a new access token.

| Field  | Value                  |
|--------|------------------------|
| Method | `POST`                 |
| Route  | `/api/auth/refresh`    |
| Auth   | None                   |

### Request Body

```json
{
  "refreshToken": "eyJ..."
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

## 5. Logout

**Purpose:** Invalidate the current session / refresh token.

| Field  | Value               |
|--------|---------------------|
| Method | `POST`              |
| Route  | `/api/auth/logout`  |
| Auth   | None (token optional) |

### Request Body

```json
{
  "refreshToken": "eyJ..."
}
```

> `refreshToken` is optional — if omitted, server-side session cleanup is still attempted.

### Response `200`

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {}
}
```

---

## 6. Forgot Password

**Purpose:** Send a password-reset link to the provided email address.

| Field  | Value                         |
|--------|-------------------------------|
| Method | `POST`                        |
| Route  | `/api/auth/forgot-password`   |
| Auth   | None                          |

### Request Body

```json
{
  "email": "user@example.com"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "If an account exists for that email, a reset link has been issued",
  "data": {}
}
```

> The response is intentionally ambiguous to prevent email enumeration.

---

## 7. Reset Password

**Purpose:** Set a new password using the token from the reset email.

| Field  | Value                         |
|--------|-------------------------------|
| Method | `POST`                        |
| Route  | `/api/auth/reset-password`    |
| Auth   | None                          |

### Request Body

```json
{
  "token": "reset_token_from_email",
  "password": "NewStrongPass1"
}
```

| Field      | Type   | Required | Notes                        |
|------------|--------|----------|------------------------------|
| `token`    | string | ✅       | One-time reset token         |
| `password` | string | ✅       | Same rules as registration   |

### Response `200`

```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {}
}
```

---

## 8. Verify Email

**Purpose:** Confirm a user's email address using the verification token.

| Field  | Value                        |
|--------|------------------------------|
| Method | `POST`                       |
| Route  | `/api/auth/verify-email`     |
| Auth   | None                         |

### Request Body

```json
{
  "token": "email_verification_token"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {}
}
```

---

## 9. Resend Verification Email

**Purpose:** Re-send the email verification link for the currently authenticated user.

| Field  | Value                                  |
|--------|----------------------------------------|
| Method | `POST`                                 |
| Route  | `/api/auth/resend-verification`        |
| Auth   | `Bearer <token>` ✅                    |

### Request Body

None

### Response `200`

```json
{
  "success": true,
  "message": "Verification email dispatched",
  "data": {}
}
```

---

## Missing / Suggested Endpoints

| Endpoint                          | Reason                                                                   |
|-----------------------------------|--------------------------------------------------------------------------|
| `POST /api/auth/change-password`  | Allows an authenticated user to change their password without a reset flow — currently only supported via `reset-password` (which requires a token from email) |
| `POST /api/auth/revoke-sessions`  | Useful for revoking ALL active refresh tokens (e.g., "log out everywhere") |
