# BizzyBot AI — Project Bible

> BizzyBot is a **multi-industry AI-powered business automation platform** for any client-facing business.

---

## Project Instructions

> These are standing instructions Claude must follow in every session without exception.

---

### 🧠 Who I Am
- I am the founder of BizzyBot — I am **not a developer**
- Explain everything in plain English, like talking to a smart business owner who has never coded
- Never assume I understand technical jargon — always define it if you use it
- If something is complex, break it into simple numbered steps

---

### ✅ Before Making ANY Change
- **Always tell me exactly what you're going to do and why before doing it**
- List every file you plan to create or edit
- Wait for me to say "go ahead" or "yes" before touching anything
- If a change feels risky, flag it clearly and suggest a safer alternative

---

### 🛠️ How to Make Changes
- Edit files directly — never give me code to copy and paste
- Make one logical change at a time, not everything at once
- After each change, explain in plain English what was done and what it affects
- Always tell me how to test that it worked

---

### 💾 Git & Deployment
- After completing a feature or fix, **automatically commit and push to GitHub**
- Use clear, descriptive commit messages (e.g. "Add SMS auto-reply toggle to settings page")
- Never force push to main
- Railway auto-deploys when GitHub is pushed — no need to mention it
- Always ask before running database migrations — these can break production

---

### 🎨 Code Style
- Follow existing patterns already in the codebase — don't introduce new ones without asking
- Tailwind CSS for all styling
- Keep components small and focused
- Never hardcode real-estate-specific language — BizzyBot is multi-industry

---

### 🤖 AI Behavior (Critical)
- The AI tone, personality, and knowledge is **fully controlled by each customer from their dashboard**
- Customers input their own: business info, pricing, scheduling, next steps, tone (friendly/professional/concise etc.)
- Never hardcode AI personality or responses into the codebase
- All AI behavior should flow from the customer's stored settings in the database

---

### 📋 Before Every Session
- Read this CLAUDE.md fully
- Run `git status` to check for uncommitted changes
- Ask: "What do you want to work on today?"

---

### ❌ Never Do These
- Never make changes without explaining them first and getting approval
- Never give me partial code to merge manually
- Never assume something works — always provide test steps
- Never push breaking changes to main without warning me
- Never use real-estate-only language in new features

---

## What This Platform Does

BizzyBot gives businesses an AI agent that:
- Responds to leads automatically across SMS, Email, Facebook, Instagram, and web chat
- Scores and classifies leads (hot/warm/cold) using AI
- Manages multi-channel conversations from a unified dashboard
- Handles billing/subscriptions and onboarding automatically

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + React 18 |
| Styling | Tailwind CSS + Lucide Icons |
| Auth | Clerk (multi-tenant) |
| Database | PostgreSQL (Railway) via `pg` |
| Payments | Stripe (webhooks + subscriptions) |
| AI | OpenAI GPT-4o-mini |
| SMS | Twilio |
| Email | Gmail OAuth + Resend |
| Social | Facebook Messenger + Instagram DM APIs |

---

## Pricing Tiers

| Plan | Price | Target |
|------|-------|--------|
| Starter | $29/mo | Solo/small businesses getting started |
| Professional | $69/mo | Businesses wanting social media channels |
| Business | $199/mo | High-volume operations + voice calls |

### What each tier includes

| Feature | Starter | Professional | Business |
|---|---|---|---|
| Email AI | ✅ | ✅ | ✅ |
| SMS AI | ✅ | ✅ | ✅ |
| Web Chat | ✅ | ✅ | ✅ |
| Scheduling | ✅ | ✅ | ✅ |
| Lead tracking & export | ✅ | ✅ | ✅ |
| Facebook Messenger AI | ❌ | ✅ | ✅ |
| Instagram DM AI | ❌ | ✅ | ✅ |
| Full analytics | ❌ | ✅ | ✅ |
| AI Voice calls | ❌ | ❌ | ✅ |
| AI responses/mo | 300 | 1,500 | 5,000 |
| User seats | 1 | 2 | 5 |

### Stripe price IDs
⚠️ New Stripe prices need to be created for $29, $69, $199 and IDs updated in `lib/stripe.js`

---

## Pages Built

### Public
- `/` — Landing page
- `/pricing` — Pricing page
- `/privacy`, `/terms` — Legal
- `/amanda` — AI demo
- `/demo` — Product demo
- `/payment-success` — Post-checkout

### Auth & Onboarding
- `/sign-in`, `/sign-up` — Clerk auth
- `/onboarding` — New user setup

### Dashboard (Protected)
- `/dashboard` — Main overview
- `/leads` — Lead list with hot/warm/cold filtering
- `/leads/[id]` — Individual lead detail
- `/analytics` — Cross-channel metrics
- `/settings` — User/account settings
- `/ai-config` — AI behavior configuration

### Email
- `/email` — Email inbox/dashboard
- `/email/manage-templates` — Template editor
- `/email/settings` — Gmail connection settings
- `/email/setup` — Gmail OAuth setup

### SMS
- `/sms-dashboard` — SMS conversation center
- `/sms-setup` — Twilio setup
- `/sms-onboarding` — Phone number provisioning
- `/customer-sms-dashboard` — Customer-facing SMS view

### Social
- `/facebook-setup` — Facebook Messenger integration
- `/instagram-setup` — Instagram DM integration

### Admin
- `/admin/migrate` — Run DB migrations
- `/admin/fix-database` — Database repair tools
- `/admin/db-update` — Schema updates

---

## Database Tables

`customers`, `conversations`, `messages`, `hot_leads`, `gmail_connections`, `gmail_conversations`, `gmail_messages`, `email_conversations`, `email_messages`, `ai_analytics_events`, `contacts`

---

## Core Features Status

### ✅ Completed
- Multi-tenant auth (Clerk)
- Stripe billing (all 3 tiers, webhooks, plan-gating)
- PostgreSQL schema + admin migration tools
- AI lead scoring (hot/warm/cold + urgency detection)
- Gmail OAuth — thread tracking + AI replies
- Twilio SMS — phone number management + AI responses
- Facebook Messenger + Instagram DM webhooks
- Embeddable web chat widget
- Unified analytics dashboard (email/SMS/chat/social)
- Google Sheets lead export
- Calendly integration
- Secure middleware on all dashboard routes
- Lead notes, filtering, per-lead detail view
- 100+ API routes covering all integrations

### 🔄 In Progress / Needs Review
- [ ] Update status here as work continues

### ⚠️ Known Issues — Fix Before Launch
- No known critical issues at this time.

### ❌ Not Started
- [ ] Update status here as new features are planned

---

## Session Log

> Update this section at the end of every Claude Code session.

### Session — 2026-05-29
**Railway cron job — Gmail automation runs without dashboard open**

- Created `app/api/cron/run/route.js` — protected endpoint Railway calls every hour
- Endpoint queries all customers with `status = 'connected'` in `gmail_connections` table
- For each customer, calls existing `/api/gmail/monitor` with `action: 'check'` — runs email polling + follow-ups
- Protected by `CRON_SECRET` env var (Bearer token header) so only Railway can trigger it
- Added `CRON_SECRET=bizzybot-cron-all-channels` to Railway production env vars via Railway agent
- Created `bizzybot-cron` service on Railway with schedule `0 * * * *` (top of every hour)
- Cron runs a `curl POST` to `https://bizzybotai.com/api/cron/run` with the Bearer token
- SMS, Facebook, Instagram were confirmed already webhook-based — always on, no cron needed
- Gmail was the only channel requiring polling — now fully automated

**Key files changed:**
- `app/api/cron/run/route.js` — new file

**Next priorities:**
- [ ] Create $29/$69/$199 prices in Stripe dashboard and update 3 `priceId` values in `lib/stripe.js` before going live
- [ ] Register BizzyBot as Twilio ISV; pre-buy number pool so new customers get a SMS number instantly on signup
- [ ] Dashboard Analytics redesign (paused until Scheduling feature is complete)
- [ ] Add "Last Active" toggle to date filter row on Leads page (discussed, not built)
- [ ] Tighten onboarding flow — ask industry/business description/tone upfront so AI is pre-configured from day one

---

### Session — 2026-05-24 (continued x2)
**Admin command center — trial tracking, churn tracking, CSV export**

**Stripe webhook (`app/api/stripe/webhook/route.js`):**
- All four billing events now write to the `customers` DB table in addition to Clerk metadata
- `checkout.session.completed` → writes `plan`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `trial_ends_at`
- `customer.subscription.updated` → updates `subscription_status` and `trial_ends_at` by `stripe_subscription_id` (fast indexed lookup, no full user list scan)
- `customer.subscription.deleted` → sets `subscription_status = 'canceled'`, `churned_at = NOW()`, `plan = 'free'`
- `invoice.payment_failed` → sets `subscription_status = 'past_due'`
- Fixed `getUserList()` calls — added `limit: 500` (was silently returning only 10 users before)
- Also updated plan detection to check `STRIPE_PROFESSIONAL_PRICE_ID` / `STRIPE_BUSINESS_PRICE_ID` env vars

**Admin customers API (`app/api/admin/customers/route.js`):**
- `ensureColumns()` adds 5 new columns on first load: `subscription_status`, `trial_ends_at`, `churned_at`, `last_active_at`, `phone`
- Hardcoded `kernopay@gmail.com` as admin fallback (alongside `ADMIN_EMAIL` env var)
- Returns enriched customer rows: `trial_days_left`, `is_on_trial`, `is_paid`, `is_churned`, `is_past_due`, `mrr_contribution`
- `last_active_at` computed from latest message across `gmail_messages` + `messages` tables if DB column is empty
- Channel connections: `has_gmail`, `has_sms`, `has_facebook`
- Returns `summary` block: `mrr`, `arr`, `trial`, `paid`, `churned`, `past_due`, `expiring_soon`, `trial_conversion_rate`

**Admin dashboard page (`app/admin/dashboard/page.js`) — full rebuild:**
- 7-stat KPI row: MRR, ARR, paid count, trial count, churned count, past due, trial conversion %
- Plan MRR breakdown cards with correct prices ($29/$69/$199 — was wrong at $49/$149/$499)
- 5 tabs: All / Trial / Paid / Churned / Past Due — with live counts
- Search bar: filter by name, email, or phone number
- Table columns: Business, Email, Phone, Plan, Status, Trial/Joined, Last Active, AI Uses, Channels
- Trial countdown badge — shows days remaining, turns red at 3 days or less with ⚠ warning
- Churn date shown in Churned tab rows
- Channel connection dots (Email / SMS / Facebook) — green = connected, gray = not
- "Export CSV" button — downloads full customer list with all fields for due diligence / company sale
- Footer note: "Export CSV contains all customer data needed for due diligence"

**Key files changed:**
- `app/api/stripe/webhook/route.js`
- `app/api/admin/customers/route.js`
- `app/admin/dashboard/page.js`

**Next priorities:**
- [ ] Create $29/$69/$199 prices in Stripe dashboard and update 3 `priceId` values in `lib/stripe.js` before going live
- [ ] Register BizzyBot as Twilio ISV; pre-buy number pool so new customers get a SMS number instantly on signup
- [ ] Dashboard Analytics redesign (paused until Scheduling feature is complete)
- [ ] Add "Last Active" toggle to date filter row on Leads page (discussed, not built)
- [x] Railway cron job — `/api/cron/run` runs hourly, handles Gmail for all customers automatically

---

### Session — 2026-05-24 (continued)
**Landing page rebuild**

- Replaced the old landing page (`app/page.js`) with an industry-leading design inspired by Linear/Vercel/Stripe
- Background: `#070B14` near-black with a subtle CSS dot-grid overlay and a violet glow radial gradient behind the hero — adds depth without being distracting
- Headline changed from generic "Your Business, Powered by AI" → outcome-driven "Every lead answered. While you sleep."
- Added `DashboardPreview` component (defined at module scope, not inside the page component to prevent React remount bugs): a realistic mock of the actual dashboard showing lead scores, AI reply badges, hot lead chips, and an animated "monitoring 5 channels" status dot
- Added social proof strip between hero and how-it-works: 5-star rating, "500+ businesses", three bold stats (< 60s response time, 94% lead capture, 3× meetings)
- Replaced feature pills that broke flow with a clean "How it works" section — 3 numbered steps with gradient connector line
- Feature section: 4 focused cards + 8-item capability checklist (automated follow-ups, lead scoring, escalation, multi-channel inbox, analytics, document link sending, Facebook/Instagram DMs, custom AI tone)
- Testimonials section: 3 cards (Medical, Home Services, Fitness) with star ratings
- Pricing section: $29 Starter / $69 Professional / $199 Business — matching actual plan structure; "Most popular" badge on Professional; 14-day free trial on all CTAs
- Final CTA: glowing dark card with "Start for free. See results this week." and a single trial button
- Footer simplified to logo + 3 links (Privacy, Terms, Demo) + copyright
- Contact form removed — Clerk sign-up modal is the conversion point; form added friction with no clear benefit
- SignedIn redirect redesigned to dark spinner matching overall page theme
- All IntersectionObserver JS, formData state, and handleSubmit handler removed (unneeded complexity)

**Key files changed:**
- `app/page.js` — complete rewrite (~540 lines)

**Next priorities:**
- [ ] Create $29/$69/$199 prices in Stripe dashboard and update 3 `priceId` values in `lib/stripe.js` before going live
- [ ] Register BizzyBot as Twilio ISV; pre-buy number pool so new customers get a SMS number instantly on signup
- [ ] Dashboard Analytics redesign (paused until Scheduling feature is complete)
- [ ] Add "Last Active" toggle to date filter row on Leads page (discussed, not built)
- [x] Railway cron job — `/api/cron/run` runs hourly, handles Gmail for all customers automatically

---

### Session — 2026-05-24
**Document link sending**

- Added "Document / Form to Send Leads" section to AI Settings (all channel tabs via `SharedFields`)
- Customer pastes a document name (e.g. "Liability Waiver") and a URL (Google Drive, DocuSign, Google Forms, PandaDoc, etc.)
- AI includes the link naturally as a next step once a lead is clearly qualified — prompt instruction explicitly says not to include it in every message, only at the right moment
- New DB columns on `ai_channel_settings`: `document_link TEXT`, `document_description TEXT` — added via `ALTER TABLE IF NOT EXISTS` in `ensureChannelSettingsTableExists`
- Fields loaded/saved through existing `/api/ai-settings` GET/POST handlers
- Prompt instruction added to `buildChannelSpecificPrompt` in `lib/ai-service.js`
- Fields flow through `getCustomerAIConfiguration` channel settings merge like escalation/follow-up fields
- **Not built (v2):** Storing documents the lead sends back — requires file storage infrastructure (S3/Vercel Blob) not yet in the project

**Key files changed:**
- `app/(dashboard)/ai-settings/page.js` — Document section in SharedFields
- `app/api/ai-settings/route.js` — new columns in table setup, GET load, POST save (update + insert paths)
- `lib/ai-service.js` — document fields in channelSettings extraction, config merge, and buildChannelSpecificPrompt

**Next priorities:**
- [ ] Create $29/$69/$199 prices in Stripe dashboard and update 3 `priceId` values in `lib/stripe.js` before going live
- [ ] Register BizzyBot as Twilio ISV; pre-buy number pool so new customers get a SMS number instantly on signup
- [ ] Dashboard Analytics redesign (paused until Scheduling feature is complete)
- [ ] Add "Last Active" toggle to date filter row on Leads page (discussed, not built)
- [x] Railway cron job — `/api/cron/run` runs hourly, handles Gmail for all customers automatically
- [ ] Tighten onboarding flow — ask industry/business description/tone upfront so AI is pre-configured from day one

---

### Session — 2026-05-23 (continued)
**AI Brain — conversation history, automated follow-ups, escalation handling**

**Conversation history (`app/api/gmail/monitor/route.js`):**
- AI now loads all prior messages from the Gmail thread before generating a reply
- Queries `gmail_messages` joined to `gmail_conversations` by `thread_id`, maps rows to `{role, content}` pairs (`sender_type='ai'` → `'assistant'`, else `'user'`)
- Capped at 20 messages, 1000-char body truncation per message for token safety
- Passed to `generateGmailResponse` instead of the previous empty array `[]`

**Automated follow-ups (`app/api/gmail/monitor/route.js` + `app/api/ai-settings/route.js` + `app/(dashboard)/ai-settings/page.js`):**
- When a lead goes silent after the AI's last reply, the AI auto-sends a re-engagement email after a configurable delay (2/3/5/7 days), up to a configurable max (1×/2×/3×)
- Settings live in AI Settings → Email tab → "Automated Follow-ups" section (toggle + delay selector + max selector)
- `checkForFollowUps(gmail, connection, dbConnectionId)` function runs at the end of every email poll cycle (`checkForNewEmails`)
- Follow-ups are saved to `gmail_messages` and visible in the dashboard like any regular AI reply
- Tracking columns `followup_count` and `last_followup_at` added to `gmail_conversations` via `ALTER TABLE IF NOT EXISTS` on first run
- New DB columns on `ai_channel_settings`: `followup_enabled`, `followup_delay_days`, `followup_max_count`
- **Bug fixed:** `respondToEmail` never stamped `last_ai_response_at` — follow-up query would never match. Now updates this column after every AI send.
- **Bug fixed:** Follow-ups were sent but not saved to `gmail_messages` (invisible in dashboard). Fixed by calling `saveMessageToDatabase` after each follow-up send and updating `last_ai_response_at` to the follow-up's timestamp so next cycle measures from the correct date.

**Escalation handling (`lib/ai-service.js` + `app/api/ai-settings/route.js` + `app/(dashboard)/ai-settings/page.js`):**
- Two-layer detection: fast keyword pre-check (before OpenAI call) + `[ESCALATE]` marker in system prompt for nuanced AI-detected cases
- When triggered, AI steps aside and sends the owner's custom handoff message instead of guessing
- Configurable per channel in AI Settings → each channel tab → "Escalation Handling" section (toggle + trigger keywords + escalation message)
- Keywords field is optional — leaving it blank lets the AI decide on its own using the system prompt instruction
- New DB columns on `ai_channel_settings`: `escalation_enabled`, `escalation_triggers`, `escalation_message`
- `checkForEscalation(message, triggers)` helper splits comma-separated triggers and does a lowercase includes check
- Escalation settings loaded in `getCustomerAIConfiguration` and merged into the config object for all channels

**Key files changed this session:**
- `app/api/gmail/monitor/route.js` — conversation history, follow-up engine, last_ai_response_at fix
- `lib/ai-service.js` — escalation pre-check, [ESCALATE] marker in prompt, checkForEscalation helper, escalation + follow-up settings loading/merging
- `app/api/ai-settings/route.js` — 6 new DB columns added to ensureChannelSettingsTableExists (with ALTER TABLE for existing tables), GET/POST handlers updated
- `app/(dashboard)/ai-settings/page.js` — Escalation section in SharedFields (all channels), Follow-up section in email tab only

**Next priorities:**
- [ ] Create $29/$69/$199 prices in Stripe dashboard and update 3 `priceId` values in `lib/stripe.js` before going live
- [ ] Register BizzyBot as Twilio ISV; pre-buy number pool so new customers get a SMS number instantly on signup
- [ ] Dashboard Analytics redesign (paused until Scheduling feature is complete)
- [ ] Add "Last Active" toggle to date filter row on Leads page (discussed, not built)
- [x] Railway cron job — `/api/cron/run` runs hourly, handles Gmail for all customers automatically

---

### Session — 2026-05-23
**Lead scoring, email filtering hardening, leads page UX improvements**

**Lead scoring:**
- Added automated sender zero-scoring safety net in `lib/leads-service.js` — if a contact's email local-part matches known noreply/notification prefixes (noreply, no-reply, notifications, mailer-daemon, etc.) `calculateLeadScore` returns 0 immediately. Defense-in-depth in case a bad sender slips through the email filter.
- Decided NOT to overhaul scoring algorithm — current Engagement/Recency/Contact/Frequency model is good enough for a non-CRM product at this price point. Revisit when/if product evolves toward full CRM.

**Email filtering hardening (`lib/email-filtering.js` + `app/api/gmail/monitor/route.js`):**
- Added `AUTOMATED_SUBDOMAINS` check to `checkSenderPatterns` — catches senders like `hello@news.railway.app` or `hello@notify.company.com` where the local-part is normal but the subdomain signals automation. Only fires on 3+ part domains so root domains (e.g. `uber.com`) are unaffected.
- Fixed `respondToEmail` in monitor route: contact/lead creation now runs AFTER the filter check, matching the safe order already in `checkForNewEmails`. Previously, manually clicking Respond on any email still created a lead record even for filtered senders.

**Leads page (`app/(dashboard)/leads/page.js`):**
- Added date filter row (All time / Today / 7 / 30 / 90 days) filtering by `created_at`
- Added sort direction toggle (↑↓ arrow button next to sort dropdown) — flips any sort; resets to desc when sort field changes
- Added channel filter dropdown (All Channels / Email / SMS / Facebook / Instagram / Web Chat)
- Added "Added [date]" subtitle under Last Activity column — stacks in same cell, no extra column width
- Updated sort dropdown: added "Sort by Date Added", removed "Sort by Stage" (covered by Stage filter), renamed "Sort by Recent" → "Sort by Last Active"

**Next priorities:**
- [ ] Add "Last Active" toggle to date filter row (discussed, not built — lets users filter leads by when they last engaged vs when they were added)
- [ ] Create $29/$69/$199 prices in Stripe dashboard and update 3 `priceId` values in `lib/stripe.js` before going live
- [ ] Register BizzyBot as Twilio ISV; pre-buy number pool so new customers get a SMS number instantly on signup
- [ ] Dashboard Analytics redesign (paused until Scheduling feature is complete)

---

### Session — 2026-05-21 (continued)
**Web Chat dashboard + embed instructions**

- Created `/web-chat` page inside the dashboard (with sidebar) — shows the unique embed code snippet, 5-step installation guide, platform quick guides (WordPress, Wix, Squarespace, Webflow, Shopify, plain HTML), and a "Test your bot" link to `/demo`
- Updated sidebar "Web Chat" nav link from `/demo` → `/web-chat`
- Fixed `/demo` page: now pulls real business name from `/api/dashboard` and falls back to Clerk first name; replaced hardcoded "Test Real Estate Co" and real estate example questions with neutral business-agnostic content

---

### Session — 2026-05-21
**Dashboard overhaul & AI Settings improvements**

- Created `/ai-settings` page — extracted full 5-tab AI settings UI (Email/Facebook/Instagram/SMS/Chatbot) off the main dashboard into its own page at `app/(dashboard)/ai-settings/page.js`
- Fixed input focus-loss bug on AI Settings — `SharedFields` was defined inside the component, causing React to remount it on every keystroke; moved it to module scope and passed `ch`/`update` as props
- Fixed AI Settings card background — section cards updated to `bg-[#161B22]` to match dashboard card style
- Updated sidebar "AI Settings" nav link from `/dashboard` → `/ai-settings`
- Dashboard: added 5-channel performance breakdown cards (Email, SMS, Web Chat, Facebook, Instagram) with live connection status, conversation counts, and leads
- Dashboard: removed ~900-line AISettingsSection from `dashboard/page.js`
- Dashboard: fixed "Welcome back, User" fallback bug — now uses email prefix if firstName is empty
- Dashboard: added Setup Checklist card (shows which channels are connected, auto-hides when all 5 are done)
- Dashboard: added "Today at a Glance" strip — 4 tiles showing today's conversations, leads, hot leads, avg response time
- Dashboard: added AI Automation Rate as 5th stat card with violet progress bar
- Dashboard: added Avg Response Time metric inside AI Performance card
- Dashboard: replaced Lead Management 4-box grid with a 3-stage pipeline funnel (All Conversations → Leads Captured → Hot Leads) with live conversion rate
- Dashboard: added Hot Leads Trend — pure SVG line chart (no new dependencies) pulling `dailyTrend` from existing analytics API
- Dashboard: added Recent Activity feed pulling from `/api/notifications`, shows latest hot leads with channel + time ago
- Dashboard: removed redundant "View Full Analytics" and "View All Leads / Hot Only" buttons (navigation is in the sidebar)
- Notification bell: added to sidebar layout with live hot lead feed from `/api/notifications`, unread count badge, localStorage read-state persistence, and panel with mark-all-read
- Created `app/api/notifications/route.js` — queries `hot_leads` table for last 14 days, returns formatted notification objects

**Next priorities:**
- ✅ Clerk webhook fixed — new signups auto-create a DB customer record
- ✅ Onboarding page built — 5-step flow at `/onboarding`, wired to `/api/create-customer` and `/api/onboarding/complete`

---

### Session — 2026-05-17
- Set up Claude Code environment on Windows
- Installed Node.js, GitHub CLI, configured PATH
- Connected GitHub repo (onreK/New-Real-estate-Agent) locally to `C:\Users\Kerno\New-Real-estate-Agent`
- Configured GitHub MCP server (26 tools, connected via @modelcontextprotocol/server-github)
- Created this CLAUDE.md as project memory
- **Next step:** Review in-progress features and pick up active development

---

## Important Notes

- GitHub repo: `https://github.com/onreK/bizzybot-ai`
- Local path: `C:\Users\Kerno\New-Real-estate-Agent` (folder rename optional)
- Always launch Claude Code from inside this folder
- Run `git pull` at the start of each session if edits were made on GitHub directly
