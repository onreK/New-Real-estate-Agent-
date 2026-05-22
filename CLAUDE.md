# BizzyBot AI — Project Bible

> ⚠️ Note: The GitHub repo is named "New-Real-estate-Agent" but this platform has evolved far beyond real estate.
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

- Repo name on GitHub (`New-Real-estate-Agent`) is misleading — platform is multi-industry
- Local path: `C:\Users\Kerno\New-Real-estate-Agent`
- Always launch Claude Code from inside this folder
- Run `git pull` at the start of each session if edits were made on GitHub directly
