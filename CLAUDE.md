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
| Plan | Price ID |
|---|---|
| Starter $29/mo | `price_1TcLVq01O3SsJO6lr6j8MbWK` |
| Professional $69/mo | `price_1TcLVr01O3SsJO6lyOqWsyhT` |
| Business $199/mo | `price_1TcLVs01O3SsJO6lUmCp5Ojl` |

### Stripe coupons
| Code | Discount | Duration |
|---|---|---|
| `BIZZYFOUNDER` | 50% off | 12 months — for early beta/founder customers |
| `BIZZYFRIEND` | 20% off | 3 months — referral discount for new signups |

Referral tracking (crediting the referrer) is not yet built — planned for a future session.

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

### Session — 2026-05-29 (continued x7)
**Twilio A2P registration guide + privacy policy CTIA fix**

**Privacy policy (`app/privacy/page.js`):**
- Added Section 4.0 "SMS / Mobile Data" with CTIA-required statement: "Mobile information is never shared with third parties for marketing or promotional purposes"
- Required by CTIA for A2P campaign approval — campaigns are rejected without this language

**Twilio A2P Brand registration — fields for owner to enter:**
- Path: Twilio Console → Messaging → Senders → A2P 10DLC → Register a Brand
- Business Name: `Bizzy Bot Ai LLC` (must match IRS EIN records exactly)
- EIN: `39-3108116`
- Business Type: Private | Industry: Software
- Address: 13322 Inge Rd, Chester, VA 23836
- Website: https://bizzybotai.com
- Contact: owner's name + kernopay@gmail.com + 858-900-4220
- After submit: watch for OTP text to 858-900-4220 — must respond within 24 hours

**Twilio A2P Campaign registration — fields for owner to enter (after brand approved):**
- Path: same section → Register a Campaign
- Use Case: Mixed
- Description: BizzyBot AI is a multi-tenant business communication platform that enables small businesses to automatically respond to inbound leads via SMS using AI. [see full text in session transcript]
- Sample messages include opt-out instructions ("Reply STOP to opt out, HELP for help. Msg & data rates may apply.")
- Message Flow documents opt-in via inbound contact initiation
- Privacy Policy: https://bizzybotai.com/privacy | Terms: https://bizzybotai.com/terms
- Has Embedded Link: Yes | Subscriber Opt-in/Opt-out/Help: Yes

**After both Brand + Campaign approved (~13-20 business days):**
- Run `POST /api/admin/sms/buy-numbers` with `{ quantity: 20 }` to pre-buy number pool
- Test full SMS flow end-to-end

**Key files changed:**
- `app/privacy/page.js` — CTIA SMS mobile data disclosure added

**Next priorities:**
- [ ] Owner: Submit Twilio A2P Brand registration (fields above — watch for OTP text)
- [ ] Owner: After brand approved, submit Campaign registration (copy from session log)
- [ ] Owner: Add real `FACEBOOK_APP_ID` to Railway (replace placeholder)
- [ ] Owner: Register Facebook OAuth callback URL in Facebook Developer app
- [ ] Owner: Submit Facebook App Review for pages_messaging, instagram_manage_messages
- [ ] Owner: Fix Clerk app name "Bizzybot Ai" → "BizzyBot AI" in Clerk dashboard
- [ ] After approvals: buy SMS number pool, test end-to-end
- [ ] Build referral tracking — credit referrer when BIZZYFRIEND coupon used

---

### Session — 2026-05-29 (continued x6)
**Facebook & Instagram OAuth — one-click connect replaces manual token entry**

**What was built:**
- `app/api/auth/facebook/route.js` — initiates OAuth flow for both Facebook and Instagram (`?type=facebook` or `?type=instagram`). Requires Clerk auth. Signs state with HMAC using `FACEBOOK_APP_SECRET` before redirecting to Facebook.
- `app/api/auth/facebook/callback/route.js` — handles Facebook's redirect back. Verifies HMAC signature on state, verifies Clerk session matches userId in state, exchanges code for long-lived token, fetches the user's Page(s), saves to `facebook_connections` or `instagram_connections` table. For Instagram: also fetches the Instagram Business Account linked to the Facebook Page.
- Updated `app/(dashboard)/facebook-setup/page.js` — "Connect Facebook Page" button (Facebook blue). Shows connected state with page name, Reconnect + Disconnect buttons. Handles OAuth callback success/error params.
- Updated `app/(dashboard)/instagram-setup/page.js` — "Connect Instagram" button (Instagram gradient). Shows `@username` when connected. Note explaining Instagram connects through Facebook OAuth.
- `middleware.js` — added `/api/auth/facebook(.*)` to public routes and ignored routes.

**Security fixes (flagged by automated security review, fixed immediately):**
- State parameter was plain `userId:type` — forgeable, vulnerable to account takeover
- Fixed: state is now HMAC-signed with `FACEBOOK_APP_SECRET` (format: `userId:type.<sha256_sig>`). Callback uses `timingSafeEqual` to verify signature before trusting any state contents.
- Added Clerk session verification in callback — `sessionUserId` must match `userId` from state. Double lock.

**Remaining manual steps to activate OAuth:**
1. Get Facebook App ID from developers.facebook.com → your app → Settings → Basic
2. Update `FACEBOOK_APP_ID` in Railway (currently set to placeholder `REPLACE_WITH_YOUR_APP_ID`)
3. Add `https://bizzybotai.com/api/auth/facebook/callback` to Valid OAuth Redirect URIs in Facebook Login → Settings
4. Submit Facebook App Review for: `pages_messaging`, `instagram_manage_messages`, `pages_read_engagement`, `pages_manage_metadata`
   - Record a screen showing: customer connects a Page → lead sends DM → AI responds
   - Privacy policy: bizzybotai.com/privacy ✅

**Key files changed:**
- `app/api/auth/facebook/route.js` — new file
- `app/api/auth/facebook/callback/route.js` — new file
- `app/(dashboard)/facebook-setup/page.js` — OAuth button UI
- `app/(dashboard)/instagram-setup/page.js` — OAuth button UI
- `middleware.js` — OAuth routes added as public

**Next priorities:**
- [ ] Add real `FACEBOOK_APP_ID` to Railway (replace placeholder)
- [ ] Register callback URL in Facebook app OAuth settings
- [ ] Submit Facebook App Review (pages_messaging, instagram_manage_messages)
- [ ] Complete Twilio A2P Brand registration (manual — owner action)
- [ ] After A2P approved: buy SMS number pool, test end-to-end
- [ ] Fix Clerk app name: "Bizzybot Ai" → "BizzyBot AI" in Clerk dashboard
- [ ] Build referral tracking — credit referrer when BIZZYFRIEND coupon used

---

### Session — 2026-05-29 (continued x5)
**Email setup page rebuild**

**Email setup page (`app/(dashboard)/email/setup/page.js`) — full rewrite:**
- Was light/white theme — didn't match dark dashboard
- Had "Gmail Integration Coming Soon!" text — Gmail was already fully built and working
- Had a redundant Business Name field — already collected in onboarding
- Had `alert()` popups for success/error — bad UX
- Had "Custom Domain" option with DNS MX record setup — complex, not needed for launch
- Had "Email processing still in development" disclaimer — false
- Was 437 lines; now 132 lines

**Now:**
- Dark theme matching rest of dashboard
- Gmail connect is the only option — Google OAuth button
- Connected state shows green checkmarks + what's active (AI reading/replying, lead scoring, follow-ups)
- OAuth callback errors/success shown as inline banners (no alert() dialogs)
- Privacy note: "BizzyBot only reads emails from leads — never personal emails"
- Footer links to AI Settings for customization

**SMS customer dashboard** — checked and confirmed fine. It's a data view page with no redundant AI config fields.

**Design rule reinforced:** Setup pages only handle the connection. No business name, AI personality, or config fields that duplicate onboarding or AI Settings.

**Key files changed:**
- `app/(dashboard)/email/setup/page.js` — full rewrite

**Next priorities:**
- [ ] Complete Twilio A2P Brand registration (manual — owner action, start today)
- [ ] After A2P approved: buy number pool via `POST /api/admin/sms/buy-numbers`, test SMS end-to-end
- [ ] Fix Clerk app name capitalization: "Bizzybot Ai" → "BizzyBot AI" in Clerk dashboard settings
- [ ] Build referral tracking — credit the referrer when `BIZZYFRIEND` coupon is used
- [ ] Dashboard Analytics redesign (paused until Scheduling feature complete)

---

### Session — 2026-05-29 (continued x4)
**Facebook, Instagram setup pages rebuilt + AI Settings placeholder improved**

**Facebook setup page (`app/(dashboard)/facebook-setup/page.js`) — full rewrite:**
- Was a 4-step wizard asking for Business Name, Industry, AI Personality, AI Config — all redundant with onboarding
- Was telling customers to "add to Railway environment variables" — customers should never touch Railway
- Now: clean 2-step flow — Step 1: enter Page Access Token + App Secret; Step 2: copy webhook URL + verify token into Facebook
- Done state links to AI Settings for customization, not to re-enter business info here

**Instagram setup page (`app/(dashboard)/instagram-setup/page.js`) — full rewrite:**
- Was 3 steps including a redundant "AI Configuration" step (business name, personality, AI model selector)
- Now: clean 2-step flow — Step 1: copy webhook URL + verify token; Step 2: enter Access Token + Page ID
- Same done state pattern as Facebook

**Design rule established:** Channel setup pages only handle the connection (credentials + webhook). AI behavior (tone, personality, instructions) always lives in AI Settings — never duplicated in setup flows.

**AI Settings (`app/(dashboard)/ai-settings/page.js`):**
- Custom AI Instructions placeholder was "Enter custom instructions for AI behavior..." — too generic
- Now shows real business examples: "Never mention competitors by name. Always end with a question. If someone asks for pricing, give a range then offer a free consultation." etc.
- Applies to all 5 channel tabs (Email, Facebook, Instagram, SMS, Chatbot) via SharedFields

**Key files changed:**
- `app/(dashboard)/facebook-setup/page.js` — complete rewrite (~450 → ~160 lines)
- `app/(dashboard)/instagram-setup/page.js` — complete rewrite (~340 → ~170 lines)
- `app/(dashboard)/ai-settings/page.js` — Custom AI Instructions placeholder improved

**Next priorities:**
- [ ] Complete Twilio A2P Brand registration (manual — owner action, start today)
- [ ] After A2P approved: buy number pool via `POST /api/admin/sms/buy-numbers`, test SMS end-to-end
- [ ] Fix Clerk app name capitalization: "Bizzybot Ai" → "BizzyBot AI" in Clerk dashboard settings
- [ ] Check SMS setup page and Email setup page for same redundant-AI-config pattern
- [ ] Build referral tracking — credit the referrer when `BIZZYFRIEND` coupon is used

---

### Session — 2026-05-29 (continued x3)
**End-to-end signup flow testing + fixes**

**Bugs found and fixed:**
- **Clerk app name** was showing "Multi-Tenant Chatbot Platform" on signup modal → user renamed to "BizzyBot AI" manually in Clerk dashboard (Configure → Settings → Application name). Now shows "Bizzybot Ai" — capitalization can be refined to "BizzyBot AI" if desired.
- **Onboarding skipped on signup** — `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` was pointing to `/dashboard`. Updated via Railway agent to `/onboarding`. New signups now land on onboarding correctly.
- **No onboarding completion tracking** — Added `onboarding_completed BOOLEAN` column to `customers` table (auto-added via `ALTER TABLE IF NOT EXISTS`). Set to `TRUE` when `/api/onboarding/complete` is called. Dashboard now checks `/api/onboarding/status` and redirects to `/onboarding` if not completed.
- **"AI Disconnected" badge** showed red for all new users who haven't set up channels yet — misleading since nothing is broken. Now shows yellow "AI Ready" for new users, green "AI Active" once email or web chat is connected.
- **14-day free trial** was advertised on landing page but not configured in Stripe — added `subscription_data: { trial_period_days: 14 }` to checkout session creation in `app/api/stripe/create-checkout-session/route.js`.

**Testing results — full flow verified end-to-end:**
- ✅ Landing page loads, looks great, all CTAs work
- ✅ "Start free trial" opens Clerk signup modal
- ✅ Signup → email verification → onboarding (4 steps)
- ✅ Onboarding step 1: Business name, industry, phone, website
- ✅ Onboarding step 2: Business description
- ✅ Onboarding step 3: AI tone + response length (defaults pre-selected)
- ✅ Onboarding step 4: Knowledge base (optional, skip available)
- ✅ "Launch my AI" → redirects to /dashboard
- ✅ Dashboard loads with setup checklist, channel cards, stats, pipeline
- ✅ AI Settings page shows all onboarding data pre-populated correctly (business name, industry, description, tone, length, phone/website in knowledge base)
- ⚠️ Sidebar nav is visible during onboarding — user could skip onboarding by clicking any nav link. Intentional for now, not a blocker.
- ⚠️ Bot-filled textareas don't trigger React state (Continue button stays disabled until user types a character). Normal browser behavior, doesn't affect real users.

**Known minor issue:** "Welcome back, kernopay+test2" — shows email prefix as name if Clerk account has no first name set. Real users who sign up with Google or enter their name will see their name correctly.

**Key files changed:**
- `app/api/stripe/create-checkout-session/route.js` — 14-day trial added
- `app/api/onboarding/complete/route.js` — sets onboarding_completed = TRUE
- `app/api/onboarding/status/route.js` — new endpoint, returns whether onboarding is done
- `app/(dashboard)/dashboard/page.js` — onboarding redirect check + AI status badge fix
- Railway env: `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding`

**Next priorities:**
- [ ] Complete Twilio A2P Brand registration (manual — owner action, start today)
- [ ] After A2P approved: buy number pool via `POST /api/admin/sms/buy-numbers`, test SMS end-to-end
- [ ] Fix Clerk app name capitalization: "Bizzybot Ai" → "BizzyBot AI" in Clerk dashboard
- [ ] Build referral tracking — credit the referrer when `BIZZYFRIEND` coupon is used
- [ ] Dashboard Analytics redesign (paused until Scheduling feature complete)

---

### Session — 2026-05-29 (continued x2)
**SMS number pool provisioning — GoHighLevel-style instant number assignment**

**Architecture decision:** BizzyBot registers ONE brand + campaign in Twilio (one-time, ~15 business days). Pre-buys a pool of numbers. Every new customer gets a number instantly from the pool — no Twilio account needed on their end. Same approach used by GoHighLevel, HubSpot, etc.

**Code built:**
- `app/api/sms/provision/route.js` — POST assigns next available number from pool to customer; GET checks if customer already has a number. Auto-creates `customer_phone_numbers` table on first run.
- `app/api/admin/sms/buy-numbers/route.js` — Admin-only endpoint to buy N numbers from Twilio and add to pool. Optional `areaCode` param. GET returns pool status (available vs assigned count).
- `app/api/sms/webhook/route.js` — Updated `resolveCustomerFromTwilioNumber` to query `customer_phone_numbers` table first (legacy `customers.phone` fallback kept). Also enabled actual SMS sending — TwiML `<Message>` now returns the AI response (was previously empty/disabled pending A2P).

**DB table added (auto-created):**
- `customer_phone_numbers` — tracks phone_number, twilio_sid, status (available/active), clerk_user_id, customer_id, assigned_at

**Twilio A2P registration — owner must complete manually:**
1. Go to Twilio → Messaging → Senders → A2P 10DLC → Register a Brand
   - Legal business name (must match EIN exactly), EIN, business type: Private, website: bizzybotai.com
2. After brand approved (3-5 days): Register a Campaign
   - Use case: Mixed
   - Description: "AI-powered platform that responds to leads via SMS on behalf of small businesses. Messages include lead follow-ups, appointment reminders, and business inquiries."
   - Sample 1: "Hi! Thanks for reaching out to [Business Name]. I'd love to help — what questions do you have? Reply STOP to opt out."
   - Sample 2: "Just following up on your inquiry! We still have availability this week. Would you like to schedule a time? Reply STOP to opt out."
3. After campaign approved (10-15 days): Call `POST /api/admin/sms/buy-numbers` with `{ quantity: 20 }` to pre-buy the pool
- Previous A2P rejections were likely due to vague opt-in description or sample messages not matching use case

**Key files changed:**
- `app/api/sms/provision/route.js` — new file
- `app/api/admin/sms/buy-numbers/route.js` — new file
- `app/api/sms/webhook/route.js` — DB routing + SMS sending enabled

**Next priorities:**
- [ ] Complete Twilio A2P Brand registration (manual — owner action)
- [ ] After A2P approved: buy number pool via admin endpoint, test end-to-end SMS flow
- [ ] Build referral tracking into dashboard — crediting the referrer when `BIZZYFRIEND` is used
- [ ] Dashboard Analytics redesign (paused until Scheduling feature is complete)
- [ ] Add "Last Active" toggle to date filter row on Leads page

---

### Session — 2026-05-29 (continued)
**Stripe setup, platform rename to BizzyBot AI**

**Stripe (via Stripe MCP):**
- Created 3 products: BizzyBot Starter, BizzyBot Professional, BizzyBot Business
- Created 3 live recurring prices: $29/mo, $69/mo, $199/mo
- Created `BIZZYFOUNDER` coupon — 50% off for 12 months (for beta/founder customers)
- Created `BIZZYFRIEND` coupon — 20% off for 3 months (referral discount for new signups)
- Updated `lib/stripe.js` with real price IDs (removed old placeholder IDs)
- Changed "AI Voice calls (powered by ElevenLabs)" → "AI Voice calls (coming soon)" on Business plan
- Referral tracking (crediting the referrer) planned for a future session

**Platform rename:**
- GitHub repo renamed from `New-Real-estate-Agent` to `bizzybot-ai`
- Local git remote URL updated to `https://github.com/onreK/bizzybot-ai.git`
- Stripe account display name changed to "BizzyBot AI" (done manually in dashboard)
- Railway project rename to "bizzybot-ai" — do manually in Railway dashboard settings
- CLAUDE.md updated to remove old repo name references

**Key files changed:**
- `lib/stripe.js` — new price IDs

**Next priorities:**
- [x] SMS pool provisioning built — complete Twilio A2P Brand registration to activate (manual step)
- [ ] Build referral tracking into dashboard — crediting the referrer when `BIZZYFRIEND` is used
- [ ] Dashboard Analytics redesign (paused until Scheduling feature is complete)
- [ ] Add "Last Active" toggle to date filter row on Leads page (discussed, not built)
- [ ] Tighten onboarding flow — ask industry/business description/tone upfront so AI is pre-configured from day one

---

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
- [x] Stripe prices created ($29/$69/$199) and price IDs updated in `lib/stripe.js`
- [x] SMS pool provisioning built — complete Twilio A2P Brand registration to activate (manual step)
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
- [x] Stripe prices created ($29/$69/$199) and price IDs updated in `lib/stripe.js`
- [x] SMS pool provisioning built — complete Twilio A2P Brand registration to activate (manual step)
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
- [x] Stripe prices created ($29/$69/$199) and price IDs updated in `lib/stripe.js`
- [x] SMS pool provisioning built — complete Twilio A2P Brand registration to activate (manual step)
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
- [x] Stripe prices created ($29/$69/$199) and price IDs updated in `lib/stripe.js`
- [x] SMS pool provisioning built — complete Twilio A2P Brand registration to activate (manual step)
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
- [x] Stripe prices created ($29/$69/$199) and price IDs updated in `lib/stripe.js`
- [x] SMS pool provisioning built — complete Twilio A2P Brand registration to activate (manual step)
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
- [x] Stripe prices created ($29/$69/$199) and price IDs updated in `lib/stripe.js`
- [x] SMS pool provisioning built — complete Twilio A2P Brand registration to activate (manual step)
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
