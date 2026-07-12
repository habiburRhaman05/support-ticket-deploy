# Agency Dashboard API Documentation

**Base URL**: `http://localhost:8080/api`

**Auth**: Bearer token in `Authorization` header (`Authorization: Bearer <accessToken>`)

## Response Format

### Success
```json
{ "success": true, "data": { ... } }
```

### Error
```json
{ "success": false, "error": { "code": "...", "message": "..." } }
```

### Paginated
```json
{ "success": true, "notifications|tickets|logs": [...], "meta": { "total", "page", "limit", "totalPages" } }
```

---

## Portal (`/api/portal`) — sub-account entry

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/enter` | Public (rate-limited 30/15min/IP, JSON-only) | Sub-account entry via `location_id` from the GHL Custom Menu Link |

### POST `/enter`
The `locationId` is a claim, never a credential — access is only granted via our own signed session after the location is ACTIVE in the DB. Unknown IDs are verified against GHL before a pending row is created; garbage IDs create nothing.
Request: `{ "locationId": "loc123" }`
Response `data.status` is one of:
- `ACTIVE` → also returns `user`, `accessToken`, `refreshToken` (sub-account refresh tokens expire in 24h)
- `PENDING` → `{ requestedAt, created }` (idempotent — repeat clicks never duplicate the request)
- `REJECTED`
- `UNKNOWN_LOCATION` (not a location under the connected agency)

## Sub-Accounts (`/api/sub-accounts`) — owner approval queue

All routes require auth + `AGENCY_OWNER` role.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | All sub-accounts with status + decision info |
| GET | `/requests` | Pending requests only |
| POST | `/:id/approve` | Approve (idempotent; also re-approves a rejected row) |
| POST | `/:id/reject` | Reject with optional `{ "comment": "..." }` |
| POST | `/bulk-approve` | One-time onboarding: fetch all GHL locations, activate them directly. Returns `{ totalInGhl, activated, skipped }`. Never reverses an explicit rejection. |

All approve/reject/bulk actions are written to the audit log.

## Auth (`/api/auth`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/connect` | Public (rate-limited) | - | First-time owner connect: validates GHL key live, creates agency + owner |
| POST | `/login` | Public (rate-limited) | - | Email/password login (returning owners & team) |
| POST | `/refresh` | Public (rate-limited) | - | Exchange refresh token |
| POST | `/change-password` | Required | Any | Change own password |
| GET | `/me` | Required | Any | Get current user profile |

All public POSTs require `Content-Type: application/json` (CSRF hardening) and are limited to 10 requests / 15 min / IP.

### POST `/connect`
Replaces the old `/register`. The GHL key is validated against the live GHL API before anything persists, then stored AES-256-GCM encrypted.
Request:
```json
{ "email": "owner@agency.com", "password": "min8chars", "agencyName": "Agency Name", "ghlCompanyId": "company-id", "ghlApiKey": "pit-..." }
```
Response (201):
```json
{ "success": true, "data": { "user": { "id", "email", "name", "role": "AGENCY_OWNER", "initials", "agencyId", "agencyName" }, "accessToken": "...", "refreshToken": "..." } }
```
Errors: `409 ALREADY_CONNECTED`, `409 EMAIL_TAKEN`, `401 GHL_KEY_INVALID`, `502 UPSTREAM_ERROR` (GHL unreachable).

### POST `/login`
Request:
```json
{ "email": "user@example.com", "password": "..." }
```
Response (200):
```json
{ "success": true, "data": { "user": { "id", "email", "name", "role", "initials", "agencyId", "agencyName", "tempPassword", "isAvailable" }, "accessToken": "...", "refreshToken": "..." } }
```

### POST `/refresh`
Request:
```json
{ "refreshToken": "jwt..." }
```
Response (200):
```json
{ "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }
```

### POST `/change-password`
Auth: Required
Request:
```json
{ "currentPassword": "old", "newPassword": "newmin8chars" }
```
Response (200):
```json
{ "success": true, "data": { "message": "Password changed successfully" } }
```

### GET `/me`
Auth: Required
Response (200):
```json
{ "success": true, "data": { "id", "email", "name", "role", "initials", "agencyId", "agencyName", "locationId", "skills", "isAvailable", "tempPassword", "contactEmail", "plan" } }
```

---

## Users (`/api/users`)

All routes require authentication. Router-level middleware.

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/team` | Required | AGENCY_OWNER | List team members |
| POST | `/team` | Required | AGENCY_OWNER | Create team member |
| PUT | `/team/:id` | Required | AGENCY_OWNER | Update team member |
| DELETE | `/team/:id` | Required | AGENCY_OWNER | Soft-delete team member |
| PATCH | `/availability` | Required | TEAM_MEMBER | Toggle own availability |
| GET | `/stats/me` | Required | Any | Own ticket stats |
| GET | `/stats/all` | Required | AGENCY_OWNER | All team member stats |
| GET | `/sub-accounts` | Required | AGENCY_OWNER | List sub-accounts |
| POST | `/sub-accounts` | Required | AGENCY_OWNER | Create sub-account |

### GET `/team`
Response:
```json
{ "success": true, "data": [{ "id", "name", "email", "initials", "skills": [...], "isAvailable", "openTickets", "reviewTickets", "createdAt" }] }
```

### POST `/team`
Request:
```json
{ "name": "John Doe", "email": "john@example.com", "skills": ["design"] }
```
Response (201): Team member object with `tempPassword`.

### PUT `/team/:id`
Request (partial):
```json
{ "name": "New Name", "skills": [...], "isAvailable": true }
```

### DELETE `/team/:id`
Response: `{ "success": true, "data": { "message": "Team member removed" } }`

### PATCH `/availability`
Auth: TEAM_MEMBER
Response: `{ "success": true, "data": { "isAvailable": true/false } }`

### GET `/stats/me`
Response:
```json
{ "success": true, "data": { "totalAssigned", "totalSolved", "openCount", "reviewCount", "isAvailable" } }
```

### GET `/stats/all`
Auth: AGENCY_OWNER
Response: Array of per-team-member stats.

### GET `/sub-accounts`
Response:
```json
{ "success": true, "data": [{ "id", "name", "initials", "contactEmail", "plan", "locationId", "openTickets", "createdAt" }] }
```

### POST `/sub-accounts`
Request:
```json
{ "name": "Client Inc", "locationId": "loc456", "contactEmail": "client@example.com", "plan": "basic" }
```

---

## Tickets (`/api/tickets`)

All routes require authentication. Router-level middleware.

### Stages (ordered)
`NEW` → `ACCEPTED` → `WORKING` → `PENDING` → `REVIEW` → `RESOLVED`

### Stage Transition Rules
- **AGENCY_OWNER**: Any stage at any time
- **TEAM_MEMBER**: Forward only (e.g., NEW→ACCEPTED→WORKING), cannot move to RESOLVED
- **SUB_ACCOUNT**: Cannot move stages

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | Required | AGENCY_OWNER | List all tickets (paginated, filtered) |
| GET | `/mine` | Required | TEAM_MEMBER | My assigned tickets |
| GET | `/my` | Required | SUB_ACCOUNT | My submitted tickets |
| GET | `/unassigned` | Required | AGENCY_OWNER | Unassigned tickets |
| GET | `/review` | Required | AGENCY_OWNER | Tickets in REVIEW |
| POST | `/` | Required | Any | Create ticket |
| GET | `/:id` | Required | Any | Get ticket by ID |
| PATCH | `/:id/stage` | Required | AGENCY_OWNER, TEAM_MEMBER | Move stage |
| PATCH | `/:id/assign` | Required | AGENCY_OWNER | Assign/unassign |
| POST | `/:id/comment` | Required | Any | Add comment |
| GET | `/:id/history` | Required | Any | Get history |
| POST | `/:id/approve` | Required | AGENCY_OWNER | Approve (→RESOLVED) |
| POST | `/:id/reject` | Required | AGENCY_OWNER | Reject (→WORKING) |

### GET `/`
Query params (all optional): `stage`, `priority`, `category`, `assigneeId`, `subAccountId`, `search`, `page` (1), `limit` (20, max 100)
Response:
```json
{ "success": true, "tickets": [{ "id", "displayId", "subject", "description", "priority", "category", "stage", "assignee", "subAccount", "history", "attachments", "createdAt", "updatedAt" }], "meta": { "total", "page", "limit", "totalPages" } }
```

### POST `/`
Request:
```json
{ "subject": "...", "description": "...", "category": "design", "priority": "MEDIUM", "subAccountId": "optional" }
```

### GET `/:id`
Access: OWNER=all, TEAM_MEMBER=own assigned, SUB_ACCOUNT=own tickets

### PATCH `/:id/stage`
Request:
```json
{ "stage": "WORKING", "comment": "...", "sendEmail": true }
```

### PATCH `/:id/assign`
Request:
```json
{ "assigneeId": "user-id-or-null" }
```

### POST `/:id/comment`
Request:
```json
{ "comment": "...", "isInternalNote": false, "sendEmail": true }
```
Constraints: SUB_ACCOUNT can only reply when PENDING, cannot create internal notes.

### POST `/:id/approve`
Must be in REVIEW stage. Request: `{ "note": "..." }`

### POST `/:id/reject`
Must be in REVIEW stage. `note` is required. Request: `{ "note": "Reason" }`

---

## Notifications (`/api/notifications`)

Requires authentication (any role). Users only see their own notifications.

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | Required | Any | List notifications (paginated) |
| GET | `/unread-count` | Required | Any | Unread count |
| PATCH | `/:id/read` | Required | Any | Mark one as read |
| PATCH | `/read-all` | Required | Any | Mark all as read |

### GET `/`
Query: `page` (1), `limit` (20)
Response:
```json
{ "success": true, "notifications": [{ "id", "userId", "ticketId", "type", "title", "message", "isRead", "createdAt", "ticket": { "id", "displayId", "subject" } }], "meta": { "total", "page", "limit", "totalPages" } }
```

### Notification Types
| Type | Trigger |
|------|---------|
| `assignment` | Ticket assigned to member |
| `stage_change` | Stage moved (notifies sub-account; REVIEW→all owners) |
| `reply` | Comment added |

---

## Analytics (`/api/analytics`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/dashboard` | Required | AGENCY_OWNER | Dashboard analytics |

### GET `/dashboard`
Response:
```json
{ "success": true, "data": { "total", "resolved", "unassigned", "avgTouches", "stageBreakdown": { "NEW": N, ... }, "agentStats": [...] } }
```

---

## Audit Logs (`/api/audit-logs`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | Required | AGENCY_OWNER | List audit logs (paginated) |

### GET `/`
Query: `page` (1), `limit` (50)
Response:
```json
{ "success": true, "logs": [{ "id", "agencyId", "actorId", "action", "entityType", "entityId", "details", "createdAt", "actor": { "id", "name", "initials", "role" } }], "meta": { "total", "page", "limit", "totalPages" } }
```

---

## Roles

| Role | Description |
|------|-------------|
| `AGENCY_OWNER` | Full access — manage team, sub-accounts, all tickets, approve/reject |
| `TEAM_MEMBER` | Support agent — handle assigned tickets, toggle availability |
| `SUB_ACCOUNT` | Client — submit and track own tickets |

## Auth Flow

1. User logs in via `/auth/login` (or register)
2. Server returns `{ user, accessToken, refreshToken }`
3. Client stores tokens (httpOnly cookies recommended)
4. All API requests include `Authorization: Bearer <accessToken>`
5. When access token expires (15m), client calls `/auth/refresh` with refresh token
6. Server returns new token pair
7. If refresh fails, user is redirected to login
