# Admin Endpoints

Base path: `/api/admin`

All endpoints require authentication (`Bearer <token>`) with `ADMIN` role.

---

## Users

### 1. List Users

**Purpose:** Retrieve a paginated list of all registered users on the platform.

| Field  | Value                  |
|--------|------------------------|
| Method | `GET`                  |
| Route  | `/api/admin/users`     |
| Auth   | `Bearer <token>` ✅    |
| Role   | `ADMIN`                |

### Response `200`

```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": [
    {
      "id": "user_abc",
      "name": "Jane Doe",
      "email": "user@example.com",
      "role": "customer",
      "emailVerified": true,
      "createdAt": "2026-01-15T08:00:00Z"
    }
  ]
}
```

---

### 2. Get User Details

**Purpose:** Fetch full profile details for a specific user.

| Field  | Value                       |
|--------|-----------------------------|
| Method | `GET`                       |
| Route  | `/api/admin/users/:id`      |
| Auth   | `Bearer <token>` ✅         |
| Role   | `ADMIN`                     |

### Response `200`

```json
{
  "success": true,
  "message": "User details fetched successfully",
  "data": {
    "id": "user_abc",
    "name": "Jane Doe",
    "email": "user@example.com",
    "role": "customer",
    "phone": "+911234567890",
    "emailVerified": true,
    "createdAt": "2026-01-15T08:00:00Z"
  }
}
```

---

### 3. Update User Role

**Purpose:** Change a user's platform role (e.g., promote to owner or admin).

| Field  | Value                            |
|--------|----------------------------------|
| Method | `PUT`                            |
| Route  | `/api/admin/users/:id/role`      |
| Auth   | `Bearer <token>` ✅              |
| Role   | `ADMIN`                          |

### Request Body

```json
{
  "role": "owner"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "User role updated successfully",
  "data": {
    "id": "user_abc",
    "role": "owner"
  }
}
```

---

## Stays

### 4. List All Stays (Admin)

**Purpose:** View all stay listings across the platform including pending ones.

| Field  | Value                  |
|--------|------------------------|
| Method | `GET`                  |
| Route  | `/api/admin/stays`     |
| Auth   | `Bearer <token>` ✅    |
| Role   | `ADMIN`                |

### Response `200`

```json
{
  "success": true,
  "message": "Stays fetched successfully",
  "data": [
    {
      "id": "stay_abc",
      "title": "Ocean View Villa",
      "status": "pending",
      "ownerId": "user_xyz",
      "city": "Goa"
    }
  ]
}
```

---

### 5. Approve Stay

**Purpose:** Approve a stay listing, making it publicly visible.

| Field  | Value                              |
|--------|------------------------------------|
| Method | `POST`                             |
| Route  | `/api/admin/stays/:id/approve`     |
| Auth   | `Bearer <token>` ✅                |
| Role   | `ADMIN`                            |

### Response `200`

```json
{
  "success": true,
  "message": "Stay approved successfully",
  "data": { "id": "stay_abc", "status": "approved" }
}
```

---

### 6. Reject Stay

**Purpose:** Reject a pending stay listing with an optional reason.

| Field  | Value                             |
|--------|-----------------------------------|
| Method | `POST`                            |
| Route  | `/api/admin/stays/:id/reject`     |
| Auth   | `Bearer <token>` ✅               |
| Role   | `ADMIN`                           |

### Response `200`

```json
{
  "success": true,
  "message": "Stay rejected successfully",
  "data": { "id": "stay_abc", "status": "rejected" }
}
```

---

## Vehicles

### 7. List All Vehicles (Admin)

| Field  | Value                     |
|--------|---------------------------|
| Method | `GET`                     |
| Route  | `/api/admin/vehicles`     |
| Auth   | `Bearer <token>` ✅       |
| Role   | `ADMIN`                   |

### Response `200`

```json
{
  "success": true,
  "message": "Vehicles fetched successfully",
  "data": [{ "id": "vehicle_abc", "title": "Toyota Innova", "status": "pending" }]
}
```

---

### 8. Approve Vehicle

| Field  | Value                                  |
|--------|----------------------------------------|
| Method | `POST`                                 |
| Route  | `/api/admin/vehicles/:id/approve`      |
| Auth   | `Bearer <token>` ✅                    |
| Role   | `ADMIN`                                |

### Response `200`

```json
{
  "success": true,
  "message": "Vehicle approved successfully",
  "data": { "id": "vehicle_abc", "status": "approved" }
}
```

---

### 9. Reject Vehicle

| Field  | Value                                 |
|--------|---------------------------------------|
| Method | `POST`                                |
| Route  | `/api/admin/vehicles/:id/reject`      |
| Auth   | `Bearer <token>` ✅                   |
| Role   | `ADMIN`                               |

### Response `200`

```json
{
  "success": true,
  "message": "Vehicle rejected successfully",
  "data": { "id": "vehicle_abc", "status": "rejected" }
}
```

---

## Attractions

### 10. List All Attractions (Admin)

| Field  | Value                        |
|--------|------------------------------|
| Method | `GET`                        |
| Route  | `/api/admin/attractions`     |
| Auth   | `Bearer <token>` ✅          |
| Role   | `ADMIN`                      |

### Response `200`

```json
{
  "success": true,
  "message": "Attractions fetched successfully",
  "data": [{ "id": "attr_abc", "title": "Waterfall Trek", "status": "pending" }]
}
```

---

### 11. Approve Attraction

| Field  | Value                                     |
|--------|-------------------------------------------|
| Method | `POST`                                    |
| Route  | `/api/admin/attractions/:id/approve`      |
| Auth   | `Bearer <token>` ✅                       |
| Role   | `ADMIN`                                   |

### Response `200`

```json
{
  "success": true,
  "message": "Attraction approved successfully",
  "data": { "id": "attr_abc", "status": "approved" }
}
```

---

### 12. Reject Attraction

| Field  | Value                                    |
|--------|------------------------------------------|
| Method | `POST`                                   |
| Route  | `/api/admin/attractions/:id/reject`      |
| Auth   | `Bearer <token>` ✅                      |
| Role   | `ADMIN`                                  |

### Response `200`

```json
{
  "success": true,
  "message": "Attraction rejected successfully",
  "data": { "id": "attr_abc", "status": "rejected" }
}
```

---

## Owner Verification

### 13. List Pending Owner Verifications

**Purpose:** View all owner verification requests awaiting review.

| Field  | Value                          |
|--------|--------------------------------|
| Method | `GET`                          |
| Route  | `/api/admin/owners/pending`    |
| Auth   | `Bearer <token>` ✅            |
| Role   | `ADMIN`                        |

### Response `200`

```json
{
  "success": true,
  "message": "Pending owners fetched successfully",
  "data": [
    {
      "ownerId": "user_xyz",
      "name": "John Smith",
      "email": "owner@example.com",
      "documents": ["https://cdn.example.com/id-card.jpg"],
      "submittedAt": "2026-04-20T09:00:00Z"
    }
  ]
}
```

---

### 14. Approve Owner Verification

| Field  | Value                                 |
|--------|---------------------------------------|
| Method | `POST`                                |
| Route  | `/api/admin/owners/:id/approve`       |
| Auth   | `Bearer <token>` ✅                   |
| Role   | `ADMIN`                               |

### Response `200`

```json
{
  "success": true,
  "message": "Owner verification approved",
  "data": { "ownerId": "user_xyz", "status": "approved" }
}
```

---

### 15. Reject Owner Verification

| Field  | Value                                |
|--------|--------------------------------------|
| Method | `POST`                               |
| Route  | `/api/admin/owners/:id/reject`       |
| Auth   | `Bearer <token>` ✅                  |
| Role   | `ADMIN`                              |

### Response `200`

```json
{
  "success": true,
  "message": "Owner verification rejected",
  "data": { "ownerId": "user_xyz", "status": "rejected" }
}
```

---

## Bookings & Reviews

### 16. List All Bookings (Admin)

| Field  | Value                     |
|--------|---------------------------|
| Method | `GET`                     |
| Route  | `/api/admin/bookings`     |
| Auth   | `Bearer <token>` ✅       |
| Role   | `ADMIN`                   |

### Response `200`

```json
{
  "success": true,
  "message": "Bookings fetched successfully",
  "data": [
    {
      "id": "booking_abc",
      "type": "stay",
      "status": "confirmed",
      "userId": "user_123",
      "totalPrice": 7500.00
    }
  ]
}
```

---

### 17. List All Reviews (Admin)

| Field  | Value                    |
|--------|--------------------------|
| Method | `GET`                    |
| Route  | `/api/admin/reviews`     |
| Auth   | `Bearer <token>` ✅      |
| Role   | `ADMIN`                  |

### Response `200`

```json
{
  "success": true,
  "message": "Reviews fetched successfully",
  "data": [
    {
      "id": "review_abc",
      "itemType": "stay",
      "rating": 5,
      "title": "Amazing stay!",
      "userId": "user_123"
    }
  ]
}
```

---

## Missing / Suggested Endpoints

| Endpoint                                      | Reason                                                                              |
|-----------------------------------------------|-------------------------------------------------------------------------------------|
| `DELETE /api/admin/reviews/:id`               | Admin should be able to remove inappropriate/spam reviews                           |
| `POST /api/admin/stays/:id/approve` with body  | Accept/reject reason should be storable and communicated to the owner               |
| `GET /api/admin/users?role=&page=&limit=`     | List users with filtering by role and pagination (not currently schema-validated)   |
| `GET /api/admin/support/tickets`              | Admin-level view of all support tickets across all users                            |
| `DELETE /api/admin/users/:id`                 | Soft-delete or ban a user account from the platform                                 |
| `GET /api/admin/payments`                     | Platform-wide payment overview for financial reporting                              |
| `GET /api/admin/stats`                        | Platform statistics summary (total users, revenue, active listings)                 |
