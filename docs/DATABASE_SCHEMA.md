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
| plate | string | stored normalised (uppercase, no spaces/dashes); must be 1-8 letters/digits after normalisation |
| driverName | string | optional |
| platform | string | `uber` \| `bolt` \| `indrive` \| `other` |
| vehicleType | string | `sedan` \| `hatchback` \| `suv` \| `minibus` \| `other` |
| type | string | `unsafe_driving` \| `harassment` \| `robbery` \| `assault` \| `other` |
| severity | string | `low` \| `medium` \| `high` |
| description | string | |
| area | string | free text, e.g. "Braamfontein" |
| evidenceUrls | array\<string\> | Cloudinary URLs |
| status | string | `pending` → `under_review` → `confirmed` \| `rejected` |
| driverId | string \| null | set when an admin confirms the report (links to `drivers`); legacy unlinked confirmations are self-healed on re-confirm or by `scripts/fixDriverIdentity.js` |
| vehicleId | string \| null | set when an admin confirms the report (links to `vehicles`); self-healed the same way |
| confirmedAt | timestamp \| null | set when an admin confirms the report (backfilled when repairing legacy rows) |
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

## `vehicles`
| Field | Type | Notes |
|---|---|---|
| plateNumber | string | normalised (uppercase, no spaces/dashes) |
| status | string | `KNOWN` |
| driverIds | array\<string\> | linked `drivers` document IDs |
| verificationCount | number | incremented by driver verification checks |
| incidentCount | number | incremented only on admin confirmation |

Only created when an admin confirms a report — a public plate search never creates records.

## `drivers`
| Field | Type | Notes |
|---|---|---|
| name | string | as entered on the confirmed report |
| nameKey | string | lowercase match key derived from the name |
| incidentCount | number | incremented only on admin confirmation |
| vehicleIds | array\<string\> | linked `vehicles` document IDs |
| platforms | array\<string\> | union of `platform` values of its confirmed incidents (case-insensitively deduplicated, added on confirmation) |

## `verificationChecks`
| Field | Type | Notes |
|---|---|---|
| vehicleId / driverId | string | |
| plateNumber | string | |
| verifiedAt | string | ISO timestamp |

**Connection rule:** a report only affects the public driver/vehicle profile once its status is `confirmed`. Public driver search queries confirmed incidents by `driverId`/`vehicleId` and never exposes reporter identity.