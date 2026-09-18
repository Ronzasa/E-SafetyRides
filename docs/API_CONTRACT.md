# API Contract — E-SafetyRides

Base URL: `http://localhost:5000/api`

All authenticated requests send `Authorization: Bearer <token>`.
Error responses: `{ "error": "message" }` (auth module) or `{ "success": false, "error": "message" }` (reports/admin modules).

## Auth — `/api/auth`

| Method | Path | Auth | Body | Success response |
|---|---|---|---|---|
| POST | `/register` | none | `{ name, email, password, confirmPassword }` | `201 { success, user }` — no token; user must log in after registering |
| POST | `/login` | none | `{ email, password }` | `200 { user, token }` |
| GET | `/me` | required | — | `200 { user: { uid, role } }` |
| POST | `/forgot-password` | none | `{ email }` | `200 { success, message }` — sends real email via SMTP; never returns the link |
| POST | `/reset-password` | none | `{ token, newPassword, confirmPassword }` | `200 { success, message }` |

`user` object: `{ uid, name, email, role }`. `role` is `"passenger"` or `"admin"` (admins are set manually in Firestore, never via register).

**Validation rules (enforced server-side):**
- `name`: 2-50 chars, letters/spaces/hyphens/apostrophes only
- `email`: valid email format
- `password`: min 6 chars, must contain at least one letter and one number

## Reports — `/api/reports`

| Method | Path | Auth | Body / Query | Notes |
|---|---|---|---|---|
| POST | `/` | required | `{ plate, driverName?, platform, vehicleType, type, severity, description, area }` | Creates with `status: "pending"`; `plate` must be exactly 8 letters/digits after normalisation |
| GET | `/` | none | `?area&platform&severity&status` | Public — only ever returns `under_review`/`confirmed` unless a specific status is requested; never exposes `reporterId` |
| GET | `/mine` | required | — | Current user's own reports, any status |
| GET | `/:id` | none | — | Single incident; never exposes `reporterId` |
| POST | `/:id/evidence` | required | `multipart/form-data`, field `evidence` | Uploads one image to Cloudinary |
| POST | `/:id/corroborate` | required | `{ note? }` | Can't corroborate your own report |
| GET | `/:id/corroborations` | none | — | List of corroborations (no reporter identity exposed) |

`platform`: `uber` \| `bolt` \| `indrive` \| `other` (lowercase — filters are case-sensitive).
`status`: `pending` → `under_review` → `confirmed` \| `rejected`.

## Admin — `/api/admin` (requires `role: admin`)

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| GET | `/reports` | `?status` (default `pending`) | Review queue |
| GET | `/reports/:id` | — | Full detail: `{ incident, reporter: { uid, name, email }, corroborations[] }` |
| PATCH | `/reports/:id` | `{ status }` | Moderation action; confirming runs the driver/vehicle linkage exactly once and self-heals legacy unlinked confirmations |
| GET | `/trends` | `?area&platform&severity` | `{ total, byStatus, byArea, byPlatform, bySeverity }` |
| GET | `/overview` | — | `{ totalUsers, totalIncidents, pendingCount, confirmedCount }` |
| GET | `/users` | — | `{ count, users[] }` — list all registered users |
