# Support Ticket System — Final Plan (Simplified Login, No Manager Role)
*Agency Owner, Team Member, Sub-Account — three roles, simple auth, full ticket engine*

---

## 1. Roles (Final)

Only three roles now:

- **Agency Owner** — full control of the agency's support desk.
- **Team Member** — created by the Agency Owner, works assigned tickets.
- **Sub-Account** — the GHL Location, submits and tracks their own tickets.

No Manager tier, no GHL iframe/postMessage auto-connect. Everything below assumes simple, direct login screens.

---

## 2. Login Flows

### Agency Owner
Simple login form:
- Email
- Password
- Location ID *(their own agency-level identifier, stored against their account)*
- GHL API Key *(private integration key — validated against GHL once, then stored so it doesn't need re-entry every login unless they rotate it)*

On first signup, all four are captured together and the API key is test-called against GHL to confirm it's valid before the account activates.

### Team Member
- Agency Owner creates the account (name, email, role) from their dashboard.
- System generates a **temporary/dummy password**, emailed to the Team Member . admin will be provide the email ,password for login 
- Team Member logs in with **email +  password**.
-  then  shows a short onboarding screen (company policies, responsibilities, workflow expectations — same content as before, just reached via direct login instead of an invite-link flow) before landing on their dashboard.

### Sub-Account
- Logs in with **Location ID only** — no password.
- Simplest possible entry point, matching what you confirmed.

**One thing worth flagging since there's no password on this one:** a Location ID by itself is a single, static, non-secret-feeling value — if it ever leaks or is guessed, anyone with it sees that Sub-Account's tickets. Worth deciding whether you want any lightweight guardrail later (e.g. only accepting Location IDs that already exist under a connected Agency, short session expiry, or a "does this look like a browser that's used this Location ID before" check) — not blocking anything now, just flagging it as something to revisit once this is live.

---

## 3. Role-Wise Permission Matrix

. Agency Owner
User Management
✅ Create Team Member accounts
✅ Manage Team Members (edit, deactivate, remove)
✅ View all Sub-Accounts
✅ Manage role permissions
Ticket Management
✅ View every ticket across all Sub-Accounts
✅ Create tickets
✅ Assign tickets
✅ Reassign tickets
✅ Remove assignees
✅ Change ticket status to any stage
✅ Approve final resolution
✅ Close/Reopen tickets
✅ Add internal staff-only notes
✅ Reply/comment on tickets
Workflow & Automation
✅ Configure assignment rules
✅ Configure escalation rules
✅ Configure SLA rules
✅ Configure notification settings
Reporting
✅ View agency-wide analytics
✅ View team workload
✅ View individual team performance
✅ View ticket statistics
✅ Export reports
2. Team Member
Ticket Management
✅ View assigned tickets only with ticket information files etc
✅ Create tickets on behalf of clients
✅ Reply/comment on tickets of each stage complete before each stage complete must be put commentt abut this fixing  or status
✅ Add internal notes
✅ Update ticket details
✅ Move tickets through working stages (up to Review)
❌ Cannot approve final resolution
❌ Cannot close tickets permanently
❌ Cannot assign/reassign tickets
Reporting
✅ View own workload
✅ View own performance statistics
❌ Cannot view agency analytics
Administration
❌ Cannot create Team Members
❌ Cannot manage roles
❌ Cannot configure workflows
3. Sub-Account (Client)
Ticket Management
✅ Create support tickets
✅ View own tickets only
✅ Reply/comment on own tickets
✅ Upload attachments
✅ View ticket history
✅ Receive ticket status updates
Ticket Permissions
❌ Cannot assign tickets
❌ Cannot change ticket stages
❌ Cannot approve resolutions
❌ Cannot add internal notes
❌ Cannot view other Sub-Account tickets
Reporting
❌ No analytics
❌ No team performance
❌ No workload dashboard

---

## 4. Ticket Workflow (Stages)

1. **New / Open** — submitted
2. **Accepted** — acknowledged
3. **Working** — actively being handled
4. **Pending** — waiting on the client
5. **Review** — Team Member is done, waiting on Owner sign-off admin review
6. **Resolved / Closed** — approved and closed ()must need aadmin review before)

Same gate as before: a Team Member can move a ticket through every stage except Resolved — their last move is into Review, and only the Agency Owner can approve it closed (or reject it back to Working with a note).

---

## 5. Agency Owner — What They Can Do

- **Full board** across every connected Sub-Account, filterable by sub-account, assignee, priority, category, and stage.
- **Create and manage Team Members** — name, email, role, generate their login credentials, deactivate/remove at any time (removal unassigns their open tickets back into the queue, not left orphaned).
- **Assign, reassign, or remove** any Team Member from any ticket, manually or via auto-assignment rules.
- **Review queue** — see every ticket in Review with the resolving member's notes; **Approve** to close (triggers CSAT request) or **Reject** with a comment back to Working.
- **Configure automation** — assignment rules (skill match → least-busy → round robin → unassigned queue), escalation thresholds for overdue tickets, SLA targets per priority.
- **Sub-Account list** — every connected Location, open-ticket count, last activity, plan/contact info.
- **Team roster** — live availability, current workload, performance stats per member.
- **Analytics dashboard** — tickets per stage, SLA compliance %, average resolution time, CSAT trend, per-agent scorecards.
- **Audit log** — every sensitive action (assignment changes, role/account changes, deletions) timestamped and attributable.
- **Search & advanced filters** across all tickets.

---

## 6. Team Member — What They Can Do

- **Own dashboard**, scoped only to what's assigned to them:
  - **Assigned** — everything currently theirs
  - **Pending** — waiting on the client
  - **In Progress** — actively being worked
  - **Resolved** — closed and approved
  - **Closed** — terminal, for reference
  - **Ticket history** — full timeline per ticket including internal notes
- **Move tickets** through any stage except Resolved (last move is into Review).
- **Reply to clients** and **add internal-only notes** (never emailed, never visible to the Sub-Account).
- **Attachments** — view and add files/screenshots on tickets and replies.
- **Availability toggle** (Available / Away) — feeds the auto-assignment logic.
- **Personal performance stats** — tickets solved, average response time, resolution rate (private to them, not a cross-team leaderboard).
- **Notifications** — new assignment, client reply, SLA-at-risk warning, in-app + email.

---

## 7. Sub-Account — What They Can Do

- **Submit a ticket** — subject, description, category, priority, file/screenshot attachments.
- **"My Tickets"** list with live colored stage badges.
- **Open a ticket** to see the full conversation history — every stage change and comment, timestamped (internal notes never shown here).
- **Reply** to add information or follow up.
- **Notifications** — email + in-app on every stage change and every team reply.
- Logged in purely by Location ID — no account setup needed on their end.

---

## 8. Full Advanced Feature Set

**Ticket fundamentals**
- Priority levels: Low, Medium, High, Urgent
- Categories: Technical, Automation, CRM, Billing, API, and Owner-configurable additions
- Internal notes (staff-only) vs. public replies, clearly distinguished in the UI
- File/screenshot attachments on tickets and individual replies
- Full conversation/activity history per ticket, timestamped and attributed to whoever acted

**Assignment & workflow**
- Automatic assignment: skill/category match → least-busy available → round robin → unassigned queue (Owner notified)
- Manual assign/reassign/remove at any time by the Agency Owner
- Escalation rules for tickets overdue or idle past a configurable threshold
- Review/approval gate before any ticket can close

**Notifications & SLA**
- Real-time in-app notifications + email on assignment, replies, and stage changes
- SLA tracking with response-time monitoring, at-risk and breach alerts

**Search, analytics & compliance**
- Ticket search with advanced filters (stage, priority, category, sub-account, assignee, date range)
- Dashboard analytics: volume trends, SLA compliance, resolution time, per-agent performance
- CSAT rating request sent automatically after resolution
- Audit logs for all sensitive actions (assignment changes, account changes, deletions)
- Team workload balancing view for the Agency Owner

---

## 9. End-to-End Example

1. A Sub-Account logs in with their Location ID and submits an Urgent, Technical ticket with a screenshot.
2. Assignment rules find the least-busy available Team Member with a Technical skill tag; if no one's available, it drops into the Owner's Unassigned queue with a notification.
3. The Team Member gets notified, opens it from their **Assigned** view, works it, adds an internal note, replies to the client.
4. SLA timer runs against the Urgent target; if it crosses the at-risk threshold, the Owner gets an escalation alert.
5. Team Member marks it done — it moves to **Review**.
6. Agency Owner reviews the resolution note and **Approves** — ticket closes, CSAT request goes out, action is logged in the audit log.
7. Team Member's performance stats update automatically; Owner sees agency-wide SLA compliance reflect it on the analytics dashboard.

---

## 10. Open Questions

2. Should Sub-Account replies be allowed at *any* stage, or only while the ticket is in Pending? -- AFTER PENDING STAGE
3. Should removed Team Members' historical tickets stay attributed to them for reporting, or get anonymized/reassigned in reports? - KEEP NAME AND UPDATE FEILD IS DELATED
4. For the Location-ID-only login — are you comfortable with no additional guardrail for now, - YES



# Support Ticket System — Full Plan
*Prepared for Habib*

A Kanban-style support desk where an **Agency** manages tickets for its own clients (**Sub-Accounts**), with staff work gated behind an admin approval step before anything closes.

> **Assumption:** built as a scalable multi-tenant product — each Agency is its own isolated space with its own Admin(s), Team Members, and Sub-Accounts. Everything below still works if it's really just one agency; you'd just skip the tenant-isolation parts.

Note: your notes use "Admin staff" and "team member" for the same role — I'll call them **Team Members** throughout.




## 2. Ticket Workflow — 6 Stages

1. **New / Open** — submitted
2. **Accepted** — acknowledged
3. **Working** — actively being handled
4. **Pending** — waiting on the client or a third party
5. **Review** — team member is done, waiting on admin sign-off
6. **Resolved / Closed** — approved and closed

Each stage gets a color for the board. Worth making stage name/color/order **configurable per agency** rather than fixed — same idea as Trello or Linear — with these six as the default.

**Board interaction:** drag-and-drop, plus a tap-to-select-stage option on each card. Drag-and-drop alone is unreliable on small touchscreens, so the tap option matters.

## 3. Stage Comments + Auto-Email

- Every stage has a default comment, editable per agency — e.g. *Working* → "We're currently working on your [issue type], e.g. auth."
- Comment is optional: the default fires automatically unless someone opens the **update modal** to write something custom.
- Saving a comment emails the sub-account owner via a template with merge fields — ticket ID, stage, comment, agent name.
- Per-agency setting: **auto-send** immediately, or **review-before-send** (always opens the modal first).
- Every comment and email is logged on the ticket's timeline.

## 4. Assignment Logic

New ticket arrives →
1. Skill/category match, if tickets are tagged and staff have matching skills
2. Otherwise, the **least-busy available** team member (recommended default)
3. Otherwise, simple round robin

Team members get an **Available / Away** toggle. Nobody available → the ticket drops into an **Unassigned queue** and the admin is notified to assign it by hand.

## 5. Review & Approval Gate

- A team member can move a ticket through every stage except Resolved — their last move is into Review.
- Admin opens the Review queue and sees the full history plus the team member's resolution note.
- **Approve** → stage becomes Resolved → sub-account notified → (worth adding) a short rating request goes out.
- **Reject** → admin leaves a comment explaining why → ticket goes back to Working → team member is notified. *Your notes only described approve — a review with one possible outcome isn't really a review, so I added this.*

## 6. Sub-Account Portal

- Submit a ticket: subject, description, category, priority, image/file attachments
- "My Tickets" list, each with a colored stage badge
- Open a ticket to see the full timeline — every stage change and comment, timestamped
- Reply when a ticket is Pending
- Email + in-app notification on every stage change

## 7. Admin Dashboard

- Full board, filterable by sub-account, team member, priority, category
- Sub-account list: name, contact, plan, open-ticket count, last activity
- Team roster with live workload
- Unassigned queue
- Reports: tickets per stage, average resolution time, SLA compliance, per-agent performance
- Global search + filters

## 8. Team Member Workspace

- "My Tickets" — assigned only, board or list view
- Ticket detail: description, images/attachments, client info, full history
- Move stage (drag or tap) — locked out of Resolved
- Comment + optional custom email
- Availability toggle

## 9. Features Worth Adding

**Build early — high value, low effort:**
- Priority levels + category tags
- Image/file attachments on tickets and comments
- Internal-only notes (staff-visible, never emailed) vs. public comments
- In-app notification bell, not just email
- Full audit log per ticket
- Per-agency configurable stage names/colors

**Add as you scale:**
- Real-time board sync (WebSockets) so agents see each other's moves live
- SLA timers + breach alerts
- Canned responses / macros (extends your default-comment idea)
- CSAT rating after resolution
- Knowledge base to deflect repeat tickets
- Duplicate-ticket merging
- Auto-escalation if a ticket sits too long in one stage
- Slack/Zapier webhooks + a public API
- White-labeling per agency (logo, colors, custom email domain)
- 2FA for Admin and Team accounts
- Subscription tiers if you're selling this to multiple agencies

## 10. Suggested Data Model

- `agencies` — tenant record
- `users` — role (`agency_admin` / `team_member` / `sub_account`), linked to `agency_id`
- `tickets` — subject, description, priority, category, stage, assignee, sub_account_id
- `ticket_stages` — configurable per agency: name, color, order
- `ticket_stage_history` — every transition: stage, comment, who, emailed?, timestamp
- `ticket_attachments`, `notifications`, `email_templates` (per stage, per agency)

## 11. Suggested Stack

- **Frontend:** React/Next.js, `dnd-kit` for drag-and-drop, Tailwind shadcnui
- **Realtime:** Socket.io or Pusher
- **Backend:** Node.js (expressjs)  , REST 
- **Database:** PostgreSQL — clean fit for multi-tenant isolation
- **Queue/cache:** Redis + BullMQ for emails, auto-assignment, logic
- **Email:** SendGrid, Amazon SES, or Postmark
- **Storage:** claudeinery, for attachments
- **Hosting:** Docker behind a load balancer — scales horizontally as agencies grow

## 12. Suggested Build Order



## 13. Decide Before We Start Building

- One agency, or multi-agency SaaS you'll sell? (changes the architecture)
- Can a sub-account have several logins (a client team of 3 who all see the same tickets), or one login per sub-account?
- Can team members self-assign open tickets, or does only the admin assign?
- Should team members be able to create tickets on a client's behalf (e.g. phone support), or only sub-accounts and admin?