# Attractions Endpoints

Base path: `/api/attractions`

Attractions are experiences or activities listed by owners (e.g. tours, adventure sports, cultural events). They support slot-based booking.

---

## 1. Search Attractions

**Purpose:** Search/browse available attractions with optional filters.

| Field  | Value                         |
|--------|-------------------------------|
| Method | `GET`                         |
| Route  | `/api/attractions/search`     |
| Auth   | None                          |
| Notes  | Subject to `searchRateLimiter` |

### Query Parameters

| Param      | Type   | Required | Notes                             |
|------------|--------|----------|-----------------------------------|
| `q`        | string | ❌       | Keyword search on title           |
| `type`     | string | ❌       | E.g., `"tour"`, `"adventure"`    |
| `minPrice` | number | ❌       | Nonnegative                       |
| `maxPrice` | number | ❌       | Nonnegative                       |
| `page`     | number | ❌       | Default: `1`                      |
| `limit`    | number | ❌       | Default: `10`, max: `100`         |

### Example Request

```
GET /api/attractions/search?type=tour&maxPrice=2000&page=1&limit=10
```

### Response `200`

```json
{
  "success": true,
  "message": "Attractions fetched successfully",
  "data": [
    {
      "id": "attr_abc",
      "title": "Dudhsagar Waterfall Trek",
      "type": "adventure",
      "price": 1500,
      "images": ["https://cdn.example.com/trek.jpg"],
      "status": "approved"
    }
  ]
}
```

---

## 2. Get Attraction Details

**Purpose:** Fetch full details for a single attraction by ID.

| Field  | Value                    |
|--------|--------------------------|
| Method | `GET`                    |
| Route  | `/api/attractions/:id`   |
| Auth   | None                     |

### Path Parameters

| Param | Type   | Required |
|-------|--------|----------|
| `id`  | string | ✅       |

### Response `200`

```json
{
  "success": true,
  "message": "Attraction details fetched successfully",
  "data": {
    "id": "attr_abc",
    "title": "Dudhsagar Waterfall Trek",
    "description": "A guided trek through the Bhagwan Mahavir Wildlife Sanctuary.",
    "type": "adventure",
    "price": 1500,
    "images": ["https://cdn.example.com/trek.jpg"],
    "location": { "city": "Goa", "lat": 15.3145, "lng": 74.3142 },
    "ownerId": "user_xyz",
    "status": "approved"
  }
}
```

---

## 3. Get Attraction Availability

**Purpose:** Fetch slot availability for an attraction between two datetimes.

| Field  | Value                                      |
|--------|--------------------------------------------|
| Method | `GET`                                      |
| Route  | `/api/attractions/:id/availability`        |
| Auth   | None                                       |
| Notes  | Query params `checkIn` and `checkOut` ISO datetimes |

### Query Parameters

| Param     | Type   | Required | Notes                                |
|-----------|--------|----------|--------------------------------------|
| `checkIn` | string | ✅       | ISO datetime (e.g. 2026-05-01T00:00:00Z) |
| `checkOut`| string | ✅       | ISO datetime; must be after `checkIn` |

### Example Request

```
GET /api/attractions/attr_abc/availability?checkIn=2026-05-01T00:00:00Z&checkOut=2026-05-03T00:00:00Z
```

### Response `200`

```json
{
  "success": true,
  "message": "Attraction availability fetched successfully",
  "data": {
    "attractionId": "attr_abc",
    "slots": [
      {
        "id": "slot_1",
        "attractionId": "attr_abc",
        "date": "2026-05-01T00:00:00.000Z",
        "startTime": "09:00",
        "endTime": "11:00",
        "capacity": 20,
        "remainingCapacity": 5,
        "available": true
      }
    ]
  }
}
```

---

## 4. Create Attraction

**Purpose:** Allow a verified owner to list a new attraction.

| Field  | Value                  |
|--------|------------------------|
| Method | `POST`                 |
| Route  | `/api/attractions/`    |
| Auth   | `Bearer <token>` ✅    |
| Role   | `OWNER` + verified     |

### Request Body

```json
{
  "title": "Dudhsagar Waterfall Trek",
  "description": "A guided trek to the famous Dudhsagar waterfalls.",
  "type": "adventure",
  "price": 1500,
  "images": ["https://cdn.example.com/trek.jpg"],
  "location": { "city": "Goa", "lat": 15.3145, "lng": 74.3142 }
}
```

| Field         | Type     | Required | Notes               |
|---------------|----------|----------|---------------------|
| `title`       | string   | ✅       | Max 200 chars       |
| `description` | string   | ✅       |                     |
| `type`        | string   | ✅       | Max 100 chars       |
| `price`       | number   | ✅       | Nonnegative         |
| `images`      | string[] | ❌       | Up to 20 valid URLs |
| `location`    | object   | ✅       | Free-form JSON      |

### Response `201`

```json
{
  "success": true,
  "message": "Attraction created successfully",
  "data": {
    "id": "attr_new",
    "title": "Dudhsagar Waterfall Trek",
    "status": "pending"
  }
}
```

---

## 5. Update Attraction

**Purpose:** Update an existing attraction owned by the authenticated user.

| Field  | Value                    |
|--------|--------------------------|
| Method | `PUT`                    |
| Route  | `/api/attractions/:id`   |
| Auth   | `Bearer <token>` ✅      |
| Role   | `OWNER`                  |

### Request Body

All fields optional, at least one required.

```json
{
  "price": 1800,
  "description": "Now includes lunch and transport."
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Attraction updated successfully",
  "data": {
    "id": "attr_abc",
    "price": 1800
  }
}
```

---

## 6. Delete Attraction

**Purpose:** Remove an owner's attraction listing.

| Field  | Value                    |
|--------|--------------------------|
| Method | `DELETE`                 |
| Route  | `/api/attractions/:id`   |
| Auth   | `Bearer <token>` ✅      |
| Role   | `OWNER`                  |

### Response `200`

```json
{
  "success": true,
  "message": "Attraction deleted successfully",
  "data": {}
}
```

---

## 7. Get Attraction Availability

**Purpose:** Check whether an attraction is available for a given date/time range.

| Field  | Value                                    |
|--------|------------------------------------------|
| Method | `GET`                                    |
| Route  | `/api/attractions/:id/availability`      |
| Auth   | None                                     |

### Query Parameters

| Param      | Type   | Required | Notes                             |
|------------|--------|----------|-----------------------------------|
| `checkIn`  | string | ✅       | ISO 8601 with offset, not in past |
| `checkOut` | string | ✅       | ISO 8601, after `checkIn`         |

### Response `200`

```json
{
  "success": true,
  "message": "Attraction availability fetched",
  "data": {
    "attractionId": "attr_abc",
    "available": true
  }
}
```

---

## 8. Get Attraction Slots

**Purpose:** List available time slots for an attraction, optionally filtered by date.

| Field  | Value                               |
|--------|-------------------------------------|
| Method | `GET`                               |
| Route  | `/api/attractions/:id/slots`        |
| Auth   | None                                |

### Query Parameters

| Param  | Type   | Required | Notes                        |
|--------|--------|----------|------------------------------|
| `date` | string | ❌       | Format: `YYYY-MM-DD`         |

### Example Request

```
GET /api/attractions/attr_abc/slots?date=2026-06-01
```

### Response `200`

```json
{
  "success": true,
  "message": "Slots fetched successfully",
  "data": [
    {
      "id": "slot_xyz",
      "date": "2026-06-01",
      "startTime": "09:00",
      "endTime": "13:00",
      "capacity": 20,
      "bookedCount": 5,
      "available": 15
    }
  ]
}
```

---

## 9. Create Attraction Slot

**Purpose:** Add a new time slot to an attraction (owner only).

| Field  | Value                               |
|--------|-------------------------------------|
| Method | `POST`                              |
| Route  | `/api/attractions/:id/slots`        |
| Auth   | `Bearer <token>` ✅                 |
| Role   | `OWNER`                             |

### Request Body

```json
{
  "date": "2026-06-01",
  "startTime": "09:00",
  "endTime": "13:00",
  "capacity": 20
}
```

| Field       | Type   | Required | Notes                             |
|-------------|--------|----------|-----------------------------------|
| `date`      | string | ✅       | `YYYY-MM-DD`                      |
| `startTime` | string | ✅       | `HH:mm` (24-hour)                 |
| `endTime`   | string | ✅       | `HH:mm`, must be after startTime  |
| `capacity`  | number | ✅       | Integer 1–1000                    |

### Response `201`

```json
{
  "success": true,
  "message": "Slot created successfully",
  "data": {
    "id": "slot_new",
    "date": "2026-06-01",
    "startTime": "09:00",
    "endTime": "13:00",
    "capacity": 20
  }
}
```

---

## 10. Update Attraction Slot

**Purpose:** Modify an existing attraction slot.

| Field  | Value                                       |
|--------|---------------------------------------------|
| Method | `PUT`                                       |
| Route  | `/api/attractions/:id/slots/:slotId`        |
| Auth   | `Bearer <token>` ✅                         |
| Role   | `OWNER`                                     |

### Request Body

All fields optional, at least one required.

```json
{
  "capacity": 25,
  "startTime": "08:30"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Slot updated successfully",
  "data": {
    "id": "slot_xyz",
    "capacity": 25,
    "startTime": "08:30"
  }
}
```

---

## 11. Delete Attraction Slot

**Purpose:** Remove a time slot from an attraction.

| Field  | Value                                       |
|--------|---------------------------------------------|
| Method | `DELETE`                                    |
| Route  | `/api/attractions/:id/slots/:slotId`        |
| Auth   | `Bearer <token>` ✅                         |
| Role   | `OWNER`                                     |

### Response `200`

```json
{
  "success": true,
  "message": "Slot deleted successfully",
  "data": {}
}
```

---

## Missing / Suggested Endpoints

| Endpoint                                   | Reason                                                                 |
|--------------------------------------------|------------------------------------------------------------------------|
| `GET /api/attractions/:id/reviews`         | Convenience shortcut (currently via `/api/reviews?itemId=&itemType=attraction`) |
| `GET /api/attractions/featured`            | Featured attractions for homepage or landing page                      |
| `PATCH /api/attractions/:id/slots/:slotId/toggle` | Allow owner to quickly enable/disable a slot without full update |
