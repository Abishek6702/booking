# Upload Endpoints

Base path: `/api/upload`

All endpoints require authentication (`Bearer <token>`). Uploaded files are typically used to provide image URLs for stays, vehicles, attractions, or verification documents.

---

## 1. Upload Single File

**Purpose:** Upload a single file (image/document) and receive a publicly accessible URL.

| Field       | Value               |
|-------------|---------------------|
| Method      | `POST`              |
| Route       | `/api/upload/`      |
| Auth        | `Bearer <token>` ✅ |
| Content-Type | `multipart/form-data` |

### Request Body (multipart/form-data)

| Field  | Type | Required | Notes                    |
|--------|------|----------|--------------------------|
| `file` | File | ✅       | Single image or document |

### Example Request (cURL)

```bash
curl -X POST https://api.travelmate.com/api/upload/ \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.jpg"
```

### Response `200`

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://cdn.example.com/uploads/image-uuid.jpg",
    "fileName": "image-uuid.jpg",
    "mimeType": "image/jpeg",
    "size": 204800
  }
}
```

---

## 2. Upload Multiple Files

**Purpose:** Upload multiple files at once and receive an array of publicly accessible URLs.

| Field       | Value                    |
|-------------|--------------------------|
| Method      | `POST`                   |
| Route       | `/api/upload/multiple`   |
| Auth        | `Bearer <token>` ✅      |
| Content-Type | `multipart/form-data`   |

### Request Body (multipart/form-data)

| Field   | Type   | Required | Notes                              |
|---------|--------|----------|------------------------------------|
| `files` | File[] | ✅       | Multiple images or documents       |

### Example Request (cURL)

```bash
curl -X POST https://api.travelmate.com/api/upload/multiple \
  -H "Authorization: Bearer <token>" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg"
```

### Response `200`

```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": {
    "urls": [
      "https://cdn.example.com/uploads/image1-uuid.jpg",
      "https://cdn.example.com/uploads/image2-uuid.jpg"
    ]
  }
}
```

---

## Typical Workflow

1. Upload images using `POST /api/upload/` or `POST /api/upload/multiple`
2. Use returned URL(s) in subsequent requests:
   - `images[]` when creating/updating stays, vehicles, or attractions
   - `documents[]` when submitting owner verification

---

## Missing / Suggested Endpoints

| Endpoint                         | Reason                                                                        |
|----------------------------------|-------------------------------------------------------------------------------|
| `DELETE /api/upload/:fileKey`    | No way to delete a previously uploaded file — can lead to orphaned CDN files  |
| `GET /api/upload/`               | List files uploaded by the authenticated user (useful for re-using assets)    |
| File size/type validation schema | Upload limits and accepted MIME types should be documented and enforced at the route level |
