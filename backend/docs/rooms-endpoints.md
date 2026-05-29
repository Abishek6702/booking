# Rooms Endpoints

Base path: `/api/stays` (rooms are nested under stays)

Rooms belong to a stay property and are managed by the property owner.

---

## 1. Get Stay Rooms

**Purpose:** Retrieve all rooms for a specific stay property.

| Field  | Value                      |
|--------|----------------------------|
| Method | `GET`                      |
| Route  | `/api/stays/:id/rooms`     |
| Auth   | None                       |

### Path Parameters

| Param | Type   | Required |
|-------|--------|----------|
| `id`  | string | ✅       | Stay ID |

### Response `200`

```json
{
  "success": true,
  "message": "Rooms fetched successfully",
  "data": [
    {
      "id": "room_xyz",
      "name": "Deluxe Ocean Suite",
      "pricePerNight": 2500,
      "capacity": 2,
      "inclusions": ["Breakfast", "WiFi", "Mini-bar"],
      "stayId": "stay_abc"
    }
  ]
}
```

---

## 2. Create Room

**Purpose:** Add a new room to a stay property (owner only).

| Field  | Value                      |
|--------|----------------------------|
| Method | `POST`                     |
| Route  | `/api/stays/:id/rooms`     |
| Auth   | `Bearer <token>` ✅        |
| Role   | `OWNER`                    |

### Path Parameters

| Param | Type   | Required |
|-------|--------|----------|
| `id`  | string | ✅       | Stay ID |

### Request Body

```json
{
  "name": "Deluxe Ocean Suite",
  "pricePerNight": 2500,
  "capacity": 2,
  "inclusions": ["Breakfast", "WiFi", "Mini-bar"]
}
```

| Field           | Type     | Required | Notes                   |
|-----------------|----------|----------|-------------------------|
| `name`          | string   | ✅       | Max 120 chars           |
| `pricePerNight` | number   | ✅       | Positive                |
| `capacity`      | number   | ✅       | Integer ≥ 1             |
| `inclusions`    | string[] | ❌       | Up to 100 items         |

### Response `201`

```json
{
  "success": true,
  "message": "Room created successfully",
  "data": {
    "id": "room_new",
    "name": "Deluxe Ocean Suite",
    "pricePerNight": 2500,
    "capacity": 2,
    "stayId": "stay_abc"
  }
}
```

---

## 3. Update Room

**Purpose:** Edit an existing room in a stay property (owner only).

| Field  | Value                               |
|--------|-------------------------------------|
| Method | `PUT`                               |
| Route  | `/api/stays/:id/rooms/:roomId`      |
| Auth   | `Bearer <token>` ✅                 |
| Role   | `OWNER`                             |

### Path Parameters

| Param    | Type   | Required |
|----------|--------|----------|
| `id`     | string | ✅       | Stay ID |
| `roomId` | string | ✅       | Room ID |

### Request Body

Same shape as Create Room.

```json
{
  "pricePerNight": 2800,
  "inclusions": ["Breakfast", "WiFi", "Mini-bar", "Gym Access"]
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Room updated successfully",
  "data": {
    "id": "room_xyz",
    "pricePerNight": 2800,
    "inclusions": ["Breakfast", "WiFi", "Mini-bar", "Gym Access"]
  }
}
```

---

## 4. Delete Room

**Purpose:** Remove a room from a stay property (owner only).

| Field  | Value                               |
|--------|-------------------------------------|
| Method | `DELETE`                            |
| Route  | `/api/stays/:id/rooms/:roomId`      |
| Auth   | `Bearer <token>` ✅                 |
| Role   | `OWNER`                             |

### Path Parameters

| Param    | Type   | Required |
|----------|--------|----------|
| `id`     | string | ✅       | Stay ID |
| `roomId` | string | ✅       | Room ID |

### Response `200`

```json
{
  "success": true,
  "message": "Room deleted successfully",
  "data": {}
}
```

---

## Missing / Suggested Endpoints

| Endpoint                                    | Reason                                                                                 |
|---------------------------------------------|----------------------------------------------------------------------------------------|
| `GET /api/stays/:id/rooms/:roomId`          | No endpoint to fetch a single room by ID — necessary for room detail pages or edit pre-fill |
| `GET /api/stays/:id/rooms/:roomId/availability` | Check a specific room's availability for a date range, separate from overall stay availability |
