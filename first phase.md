# Concept & API Discipline Primer — read this before the connect-flow prompt

Paste this first, before the implementation prompt, in a fresh Claude Code
session (or at the top of the same one). It's short on purpose — it exists to
set ground rules, not to spec features.

## 1. What we're building (one paragraph)

A custom support-ticket web app, embedded inside GoHighLevel (GHL) through a
GHL Custom Menu Link, for an Agency to run support for its own Sub-Accounts
(GHL locations). Three roles: **Agency Owner** (connects via GHL Private
Integration API Key, manages everything), **Team Member** (works assigned
tickets), **Sub-Account** (a GHL location, auto-identified via a `location_id`
URL param when they click the embedded link from inside GHL, gated by an
owner-approval step on first access). Ticket workflow is a 6-stage board
(New → Accepted → Working → Pending → Review → Resolved), with Review needing
Owner sign-off before a ticket can close.

## 2. The one rule that matters most: don't guess the GHL API

GHL's API has gone through real changes over time — v1 vs v2 endpoints,
how Private Integration Tokens are scoped (location-level vs
agency/company-level), required headers (e.g. a `Version` header with a
date-based value), and OAuth vs token-based auth for different features.
Anything about specific endpoint paths, header names, or scopes stated from
memory (yours or mine) may be stale.

**Before writing any code that calls a GHL API endpoint:**

1. State out loud which endpoint, method, and headers you're about to use.
2. Say explicitly whether you've verified this against current GHL docs or
   are recalling it from training data.
3. If it's from training data and unverified — stop and check the docs
   (via web access if you have it), or ask the user to paste the relevant
   doc section. Don't ship a plausible-looking guess.

Doc entry points to check:
- `https://highlevel.stoplight.io/` — GHL API v2 reference
- `https://marketplace.gohighlevel.com/docs` — OAuth / marketplace app docs, if this ever needs to be a listed marketplace app
- GHL Help Center — search "Custom Menu Link" and "location.id merge tag" for the current embed/merge-variable syntax

## 3. Specific things to verify before coding — don't assume

- The exact endpoint + auth flow to validate a Private Integration Token and
  pull back company/agency info.
- Whether a single API key can list **all** locations under an agency, or
  whether Private Integration Tokens are location-scoped only (this directly
  decides whether the Owner-connect flow can work with one key at all, or
  needs a different auth path — this is the single biggest thing to nail
  down before writing the connect endpoint).
- The endpoint to fetch a single location's details by `location_id` (name,
  contact, timezone) — needed to show real info on the sub-account approval
  screen.
- Required headers on every call (Authorization scheme, `Version` header
  value, Content-Type).
- Rate limits — bulk-approve will hit many locations in a burst, so confirm
  limits and add throttling/queueing if needed.
- The current, exact merge-tag syntax for Custom Menu Links (confirm
  `{{location.id}}` is still correct, and whether an agency-level link
  supports an equivalent company/agency-id merge tag).

## 4. Standing instruction to keep this discipline through the build

Add this as a repeating rule for the whole project, not just the first
session:

> Whenever a GHL API call is about to be written, name the endpoint, method,
> and headers first, and flag whether it's verified against current docs or
> assumed. Never silently assume.

## 5. Suggested order of operations

1. Confirm the current GHL auth model (Private Integration Token scope,
   whether agency-wide access needs OAuth instead) — this blocks everything
   else, resolve it first.
2. Implement the Owner connect endpoint against the confirmed auth model.
3. Implement the single-location lookup for the sub-account flow.
4. Continue with the rest of the Phase 1 connect/approval prompt already
   provided.

**Stack (adjust to match the actual repo if different):**
- Backend: Node.js / Express, REST
- DB: PostgreSQL
- Frontend: React / Next.js
- Auth: JWT-based sessions (short-lived, refreshable)

## Scope for this phase — build these five things only

1. Agency Owner manual connect (Location/Company ID + GHL API Key → validate → admin account created → dashboard shell)
2. Sub-Account auto-connect via `location_id` URL query param → GHL Locations API lookup → pending request if new
3. Agency Owner approval queue (approve / reject / one-time bulk-approve for existing locations)
4. Sub-Account "waiting for approval" and "access denied" screens
5. Session/auth handling for both roles, with the security rules in section 4 below

Do NOT build ticket features yet — just a bare authenticated `/admin/dashboard`
and `/client/dashboard` route that confirms the right user landed in the right
place.

## Data model — extend or create as needed

```
agencies
  id, name, ghl_company_id, ghl_api_key_encrypted, connected_at

users
  id, agency_id, role[owner|team_member], email, password_hash, created_at

sub_accounts
  id, agency_id, ghl_location_id (unique), name, contact_email,
  status[pending|active|rejected], requested_at, decided_at, decided_by
```

## 1. Agency Owner connect

- `/connect` page: form with Company/Location ID + GHL API Key fields.
- On submit: call the GHL API to validate the key (use whatever endpoint
  confirms a Private Integration token is valid and returns company/location
  info — check current GHL API docs for the exact endpoint, don't guess).
- Valid → encrypt and store the API key, create the agency row if it doesn't
  exist, create/find the owner user, issue a session, redirect to
  `/admin/dashboard`.
- Invalid → clear error message, nothing partially persisted (wrap in a
  transaction).
- Add basic rate-limiting and attempt logging on this endpoint since it's a
  public-facing form.

## 2. Sub-Account auto-connect

- `/portal` entry route reads `location_id` from the query string.
- Missing `location_id` → show a "open this from inside your GHL account"
  fallback (no manual entry field — that's a deliberate product decision).
- Look up `sub_accounts` by `ghl_location_id` within the current agency
  context (confirm with me how the agency context is determined in this
  deployment — e.g. single-agency deployment for now, or an agency slug also
  present in the URL — don't assume, ask if it's ambiguous in the codebase).
- `status == active` → issue a short-lived signed session token → redirect to
  `/client/dashboard`.
- Not found → call the GHL Locations API with the agency's stored key, fetch
  name/contact, insert a `sub_accounts` row with `status = pending`, notify
  the owner (in-app notification is enough for now, email can be a stub),
  show a "request sent, waiting for approval" screen.
- `status == pending` → show the same waiting screen again, idempotent — never
  create a second pending request for the same location.
- `status == rejected` → show an "access not available, contact your agency"
  screen. Flag as a TODO whether/when a rejected sub-account should be able to
  re-request — don't build a retry loop without deciding that first.

## 3. Owner approval queue

- `/admin/requests` lists all `status = pending` sub-accounts with their
  fetched name, contact, and requested_at.
- **Approve** → `status = active`, set `decided_at`/`decided_by`, notify the
  sub-account (stub is fine).
- **Reject** → `status = rejected` with an optional comment field.
- **Bulk-approve existing locations** — a one-time onboarding action: fetch
  all locations currently under this agency from the GHL API and upsert them
  as `status = active` directly, skipping the pending queue. This is so an
  agency with dozens of existing clients doesn't force every one of them
  through an individual approval on day one — only genuinely new locations
  going forward hit the pending flow.

## 4. Security requirements — not optional

- **Never treat a raw `location_id` from the URL as authentication by
  itself.** Always validate it against the DB and issue your own signed
  session before granting dashboard access. Anyone can edit a URL query
  param — the location_id identifies a claim, not a credential.
- Encrypt the GHL API key at rest — not a plaintext column.
- Session tokens should be short-lived with a refresh mechanism. Don't rely
  solely on cookies — this runs inside a GHL iframe and third-party cookies
  are frequently blocked by browsers. Support a token-in-header or
  passed-through-storage fallback.
- CSRF protection on the connect form (it's a state-changing POST).

## 5. Acceptance checklist for this phase

- [ ] Owner connects with a real API key, lands on `/admin/dashboard`
- [ ] Invalid API key shows an error, nothing gets persisted
- [ ] New sub-account click → pending screen + request appears correctly in the owner's queue with real name/contact from GHL
- [ ] Approve → that sub-account's next click goes straight to `/client/dashboard`, no re-request
- [ ] Reject → sub-account sees the denied screen
- [ ] Repeated clicks by an already-active sub-account never create duplicate pending requests
- [ ] Manually editing `location_id` in the URL to someone else's ID does not grant access without a valid session for that location
- [ ] Bulk-approve correctly activates all currently connected GHL locations in one action