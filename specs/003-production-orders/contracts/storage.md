# Interface Contracts: Production Orders — Storage & Route Handler

**Feature**: `003-production-orders`  
**Date**: 2026-06-13

---

## Photo Upload Route Handler

**Endpoint**: `POST /api/production-orders/[id]/steps/[stepId]/photo`  
**File**: `src/app/api/production-orders/[id]/steps/[stepId]/photo/route.ts`

### Request

```
Content-Type: multipart/form-data

Fields:
  file: File   (required — the photo; JPEG, PNG, WEBP accepted)
```

### Response (Success)

```json
{
  "success": true,
  "data": {
    "id": "cuid",
    "storagePath": "production-evidence/orders/{orderId}/steps/{stepId}/{uuid}.jpg"
  }
}
```

### Response (Error)

```json
{
  "success": false,
  "code": "VALIDATION" | "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL",
  "error": "Human-readable message"
}
```

### Auth & Guards

- Session required (uses `getServerSession`)
- Permission `production-orders:execute` required
- Acting user must be `assignedToId` of the order
- Order must be `PENDING` or `IN_PROGRESS`
- File size limit: 10 MB
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`

### Side Effects

- Uploads file to Supabase Storage private bucket `production-evidence`
- Storage path format: `orders/{orderId}/steps/{stepId}/{timestamp}-{uuid}.{ext}`
- Creates `ProductionOrderStepPhoto` row with `storagePath`
- Writes `AuditLog` entry (`PRODUCTION_ORDER_PHOTO_UPLOADED`)

---

## Supabase Storage Configuration

**Bucket**: `production-evidence`  
**Visibility**: Private (no public access)  
**Access pattern**: Presigned URLs generated server-side on demand (short-lived, 60-second expiry for display)

```
production-evidence/
└── orders/
    └── {orderId}/
        └── steps/
            └── {stepId}/
                └── {timestamp}-{uuid}.jpg
```

**Presigned URL generation**: Called from `queries.ts → getStepPhotoUrl(storagePath)` using the Supabase client with service role key. URLs expire after 60 seconds and are never stored in the database.

### Cancellation Behavior

When an order is cancelled, `storagePath` records in `ProductionOrderStepPhoto` are **retained permanently**. Files in Supabase Storage are also retained. Evidence is never deleted.
