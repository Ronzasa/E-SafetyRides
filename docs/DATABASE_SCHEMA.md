# Database Schema — E-SafetyRides (Firestore)

## `users`
| Field | Type | Notes |
|---|---|---|
| name | string | 2-50 chars, letters/spaces/hyphens/apostrophes only |
| email | string | lowercased before storage |
| passwordHash | string | bcrypt, never returned to client |
| role | string | `"passenger"` \| `"admin"` — admin set manually in console |
| resetToken | string \| null | crypto random hex, set by forgot-password flow |
| resetTokenExpiry | timestamp \| null | 1 hour after generation; checked on reset-password |
| createdAt | timestamp | |

## `incidents`
| Field | Type | Notes |
|---|---|---|
| reporterId | string | uid of reporting user |
| plate | string | |
| driverName | string | optional |
| platform | string | `uber` \| `bolt` \| `indrive` \| `other` |
| vehicleType | string | `sedan` \| `hatchback` \| `suv` \| `minibus` \| `other` |
| type | string | `unsafe_driving` \| `harassment` \| `robbery` \| `assault` \| `other` |
| severity | string | `low` \| `medium` \| `high` |
| description | string | |
| area | string | free text, e.g. "Braamfontein" |
| evidenceUrls | array\<string\> | Cloudinary URLs |
| status | string | `pending` → `under_review` → `confirmed` \| `rejected` |
| corroborationCount | number | |
| createdAt / updatedAt | timestamp | |

**Composite indexes required:** `status`+`createdAt`, `platform`+`createdAt`, `reporterId`+`createdAt` (all exist in Firebase Console already).

## `corroborations`
| Field | Type | Notes |
|---|---|---|
| incidentId | string | |
| corroboratorId | string | never exposed in API responses (US-13) |
| note | string | optional |
| createdAt | timestamp | |

Not yet in Firestore (still to be built by Members 1/2): `vehicles`/`drivers` records for plate search, `verifications` records for face-match results.