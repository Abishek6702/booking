# Vehicles Endpoints

Base path: `/api/vehicles`

Vehicles are transport assets listed by owners. Currently the only supported service mode is `"ride_hailing"`.

---

## 1. Search Vehicles

**Purpose:** Search/browse available vehicles with optional filters.

| Field  | Value                     |
|--------|---------------------------|
| Method | `GET`                     |
| Route  | `/api/vehicles/search`    |
| Auth   | None                      |
| Notes  | Subject to `searchRateLimiter` |

### Query Parameters

| Param           | Type   | Required | Notes                                    |
|-----------------|--------|----------|------------------------------------------|
| `q`             | string | ❌       | Keyword search                           |
| `type`          | string | ❌       | E.g., `"sedan"`, `"suv"`, `"bike"`      |
| `serviceMode`   | string | ❌       | `"ride_hailing"`                         |
| `minCapacity`   | number | ❌       | Min passenger capacity                   |
| `minBaseFare`   | number | ❌       | Minimum base fare filter                 |
| `maxBaseFare`   | number | ❌       | Maximum base fare filter                 |
| `minPricePerKm` | number | ❌       | Min price per km                         |
| `maxPricePerKm` | number | ❌       | Max price per km                         |
| `page`          | number | ❌       | Default: `1`                             |
| `limit`         | number | ❌       | Default: `10`, max: `100`               |

### Example Request

```
GET /api/vehicles/search?type=suv&minCapacity=4&page=1&limit=10
```

### Response `200`

```json
{
  "success": true,
  "message": "Vehicles fetched successfully",
  "data": [
    {
      "id": "vehicle_abc",
      "title": "Toyota Innova",
      "type": "suv",
      "capacity": 7,
      "baseFare": 200,
      "pricePerKm": 12,
      "serviceMode": "ride_hailing",
      "images": ["https://cdn.example.com/innova.jpg"],
      "status": "approved"
    }
  ]
}
```

---

## 2. Get Vehicle Details

**Purpose:** Fetch full details for a single vehicle by ID.

| Field  | Value                 |
|--------|-----------------------|
| Method | `GET`                 |
| Route  | `/api/vehicles/:id`   |
| Auth   | None                  |

### Path Parameters

| Param | Type   | Required |
|-------|--------|----------|
| `id`  | string | ✅       |

### Response `200`

```json
{
  "success": true,
  "message": "Vehicle details fetched successfully",
  "data": {
    "id": "vehicle_abc",
    "title": "Toyota Innova",
    "description": "Comfortable 7-seater SUV.",
    "type": "suv",
    "serviceMode": "ride_hailing",
    "baseFare": 200,
    "pricePerKm": 12,
    "pricePerHour": 150,
    "capacity": 7,
    "images": ["https://cdn.example.com/innova.jpg"],
    "location": { "city": "Goa", "lat": 15.2993, "lng": 74.124 },
    "ownerId": "user_xyz",
    "status": "approved"
  }
}
```

---

## 3. Get Owner Vehicles

**Purpose:** List all vehicles belonging to the authenticated owner.

| Field  | Value                      |
|--------|----------------------------|
| Method | `GET`                      |
| Route  | `/api/vehicles/owner`      |
| Auth   | `Bearer <token>` ✅        |
| Role   | `OWNER`                    |

### Response `200`

```json
{
  "success": true,
  "message": "Owner vehicles fetched successfully",
  "data": [
    {
      "id": "vehicle_abc",
      "title": "Toyota Innova",
      "status": "approved",
      "type": "suv"
    }
  ]
}
```

---

## 4. Create Vehicle

**Purpose:** Allow a verified owner to list a new vehicle.

| Field  | Value               |
|--------|---------------------|
| Method | `POST`              |
| Route  | `/api/vehicles/`    |
| Auth   | `Bearer <token>` ✅ |
| Role   | `OWNER` + verified  |

### Request Body

```json
{
  "title": "Toyota Innova Crysta",
  "description": "A well-maintained 7-seater SUV for rides and trips.",
  "type": "suv",
  "serviceMode": "ride_hailing",
  "baseFare": 200,
  "pricePerKm": 12,
  "pricePerHour": 150,
  "capacity": 7,
  "images": ["https://cdn.example.com/innova.jpg"],
  "location": { "city": "Goa", "lat": 15.2993, "lng": 74.124 }
}
```

| Field          | Type     | Required | Notes                            |
|----------------|----------|----------|----------------------------------|
| `title`        | string   | ✅       | Max 200 chars                    |
| `description`  | string   | ✅       |                                  |
| `type`         | string   | ✅       | Max 100 chars                    |
| `serviceMode`  | string   | ❌       | `"ride_hailing"` (default)       |
| `baseFare`     | number   | ✅       | Nonnegative                      |
| `pricePerKm`   | number   | ✅       | Positive                         |
| `pricePerHour` | number   | ❌       | Default: `0`                     |
| `capacity`     | number   | ✅       | Integer ≥ 1                      |
| `images`       | string[] | ❌       | Up to 20 valid URLs              |
| `location`     | object   | ✅       | Free-form JSON with location data |

### Response `201`

```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "id": "vehicle_new",
    "title": "Toyota Innova Crysta",
    "status": "pending"
  }
}
```

---

## 5. Update Vehicle

**Purpose:** Update an existing vehicle owned by the authenticated user.

| Field  | Value                 |
|--------|-----------------------|
| Method | `PUT`                 |
| Route  | `/api/vehicles/:id`   |
| Auth   | `Bearer <token>` ✅   |
| Role   | `OWNER`               |

### Path Parameters

| Param | Type   | Required |
|-------|--------|----------|
| `id`  | string | ✅       |

### Request Body

All fields from Create Vehicle are optional. At least one must be provided.

```json
{
  "baseFare": 250,
  "pricePerKm": 14
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Vehicle updated successfully",
  "data": {
    "id": "vehicle_abc",
    "baseFare": 250,
    "pricePerKm": 14
  }
}
```

---

## 6. Delete Vehicle

**Purpose:** Remove an owner's vehicle listing.

| Field  | Value                 |
|--------|-----------------------|
| Method | `DELETE`              |
| Route  | `/api/vehicles/:id`   |
| Auth   | `Bearer <token>` ✅   |
| Role   | `OWNER`               |

### Path Parameters

| Param | Type   | Required |
|-------|--------|----------|
| `id`  | string | ✅       |

### Response `200`

```json
{
  "success": true,
  "message": "Vehicle deleted successfully",
  "data": {}
}
```

---

## 7. Get Vehicle Availability

**Purpose:** Check whether a vehicle is available for a given date/time range.

| Field  | Value                                |
|--------|--------------------------------------|
| Method | `GET`                                |
| Route  | `/api/vehicles/:id/availability`     |
| Auth   | None                                 |

### Path Parameters

| Param | Type   | Required |
|-------|--------|----------|
| `id`  | string | ✅       |

### Query Parameters

| Param      | Type   | Required | Notes                                |
|------------|--------|----------|--------------------------------------|
| `checkIn`  | string | ✅       | ISO 8601 with offset, not in past    |
| `checkOut` | string | ✅       | ISO 8601, after `checkIn`            |

### Example Request

```
GET /api/vehicles/vehicle_abc/availability?checkIn=2026-06-01T09:00:00+05:30&checkOut=2026-06-01T12:00:00+05:30
```

### Response `200`

```json
{
  "success": true,
  "message": "Vehicle availability fetched",
  "data": {
    "vehicleId": "vehicle_abc",
    "available": true
  }
}
```

---

## Missing / Suggested Endpoints

| Endpoint                               | Reason                                                                 |
|----------------------------------------|------------------------------------------------------------------------|
| `GET /api/vehicles/:id/reviews`        | Convenience shortcut (currently requires `/api/reviews?itemId=&itemType=vehicle`) |
| `GET /api/vehicles/featured`           | Homepage-level featured vehicles endpoint                              |
| `PATCH /api/vehicles/:id/location`     | Allow an owner to update only their vehicle's live location without full update |
