# Owner Endpoints

Base path: `/api/owner`

All endpoints require authentication (`Bearer <token>`) with `OWNER` role.

---

## 1. Get Owner Dashboard

**Purpose:** Retrieve a high-level dashboard summary for the owner — total properties, active bookings, recent activity.

| Field  | Value                      |
|--------|----------------------------|
| Method | `GET`                      |
| Route  | `/api/owner/dashboard`     |
| Auth   | `Bearer <token>` ✅        |
| Role   | `OWNER`                    |

### Response `200`

```json
{
  "success": true,
  "message": "Dashboard fetched successfully",
  "data": {
    "totalStays": 3,
    "totalVehicles": 2,
    "totalAttractions": 1,
    "pendingBookings": 5,
    "confirmedBookings": 12,
    "totalRevenue": 125000.00,
    "recentBookings": []
  }
}
```

---

## 2. Get Owner Analytics

**Purpose:** Retrieve detailed analytics for the owner's properties (revenue, bookings over time, occupancy rates).

| Field  | Value                      |
|--------|----------------------------|
| Method | `GET`                      |
| Route  | `/api/owner/analytics`     |
| Auth   | `Bearer <token>` ✅        |
| Role   | `OWNER`                    |

### Response `200`

```json
{
  "success": true,
  "message": "Analytics fetched successfully",
  "data": {
    "revenueByMonth": [
      { "month": "2026-03", "revenue": 45000.00 },
      { "month": "2026-04", "revenue": 62000.00 }
    ],
    "bookingsByType": {
      "stay": 18,
      "vehicle": 6,
      "attraction": 3
    },
    "topProperties": []
  }
}
```

---

## 3. Submit Owner Verification

**Purpose:** Submit verification documents to become a verified owner on the platform.

| Field  | Value                                |
|--------|--------------------------------------|
| Method | `POST`                               |
| Route  | `/api/owner/verification/submit`     |
| Auth   | `Bearer <token>` ✅                  |
| Role   | `OWNER`                              |

### Request Body

```json
{
  "documents": [
    "https://cdn.example.com/id-card.jpg",
    "https://cdn.example.com/business-license.pdf"
  ]
}
```

| Field       | Type     | Required | Notes                                   |
|-------------|----------|----------|-----------------------------------------|
| `documents` | string[] | ✅       | 1–10 valid URLs (uploaded via `/api/upload`) |

### Response `201` / `200`

```json
{
  "success": true,
  "message": "Verification submitted successfully",
  "data": {
    "status": "pending",
    "submittedAt": "2026-04-26T09:00:00Z"
  }
}
```

---

## 4. Get Owner Status

**Purpose:** Check the current status of the owner's verification application.

| Field  | Value                                 |
|--------|---------------------------------------|
| Method | `GET`                                 |
| Route  | `/api/owner/verification/status`      |
| Auth   | `Bearer <token>` ✅                   |
| Role   | `OWNER`                               |

### Response `200`

```json
{
  "success": true,
  "message": "Owner status fetched successfully",
  "data": {
    "status": "approved",
    "submittedAt": "2026-04-20T09:00:00Z",
    "reviewedAt": "2026-04-22T14:00:00Z",
    "rejectionReason": null
  }
}
```

> Possible `status` values: `"not_submitted"` | `"pending"` | `"approved"` | `"rejected"`

---

## Missing / Suggested Endpoints

| Endpoint                                      | Reason                                                                                 |
|-----------------------------------------------|----------------------------------------------------------------------------------------|
| `GET /api/owner/verification/documents`        | Allow an owner to view their previously submitted verification documents               |
| `PUT /api/owner/verification/resubmit`         | After rejection, an owner should be able to resubmit with corrected documents          |
| `GET /api/owner/notifications`                 | Owner-specific notifications (new bookings, approval results, review alerts)           |
| `GET /api/owner/payouts`                       | List earnings and payout history for the owner (currently under Payments only for users) |
