# Get It Out — Store form answers (draft)

Prepared 2026-10-09 from `docs/data-flow-inventory.md`. Draft answers for
Google Play Console and App Store Connect, to fill in once the accounts
exist. **Every answer must be re-checked against the live console wording
and the release build** — consoles change their questions. Items marked
**[verify]** or **[Wayne/legal]** are not settled.

## Google Play — Data safety

**Data collection and security**

| Question | Draft answer |
|---|---|
| Does the app collect or share any required user data types? | Yes |
| Is all user data encrypted in transit? | Yes (HTTPS/TLS to Supabase, OpenAI, Anthropic, RevenueCat) |
| Do you provide a way for users to request that their data is deleted? | Yes — in-app (Settings → Privacy → Delete account) **and** a web request page **[not built yet — required]** |

**Data types** (all: collected, **not shared** — the providers act as our
service providers **[verify Google's definition of "sharing" for
processors]**)

| Category → type | Collected | Required / optional | Purposes |
|---|---|---|---|
| Personal info → Email address | Yes | Required | Account management, App functionality |
| Audio → Voice or sound recordings | Yes | Required for core feature (can be stored or not, user's choice) | App functionality |
| App activity → Other user-generated content (transcripts, typed messages, AI replies) | Yes | Required for core feature | App functionality |
| App activity → App interactions (usage counts for fair use) | Yes | Required | Fraud prevention, security and compliance |
| Financial info → Purchase history | Yes (via store + RevenueCat) | Required for subscribers | App functionality |
| App info and performance → Crash logs / Diagnostics | No (no crash/analytics SDK) | — | — |
| Device or other IDs | **[verify against RevenueCat's Data safety guidance]** | — | — |
| Location, contacts, photos, files, calendar, web history | No | — | — |
| Health info | **[Wayne/legal]** — users may talk about their mental health, but the app doesn't collect health data as such. Decide with legal review. | | |

Ephemeral processing: **don't claim it** for audio or transcripts — they
pass to OpenAI / Anthropic, whose retention terms apply **[verify]**.

## Google Play — other declarations

| Form | Draft answer |
|---|---|
| Ads | No ads |
| Target audience | 18 and over only. Not designed for or marketed to children. |
| App access | Restricted — provide a reviewer login with an active subscription and steps to record, get a reply, save, view history, and see the paywall **[set up demo account]** |
| Health apps declaration | Required for all apps. Get It Out is a voice reflection / sounding-board app, not a medical device, not therapy, not crisis care. Choose the closest wellbeing category and state that it gives no diagnosis or treatment **[Wayne/legal — check exact category list in console]** |
| Account deletion | In-app path + web URL **[web page needed]** |
| Financial features / government / news | Not applicable |

## IARC content rating (Google) — preparation

Answer from the real build, don't guess. Facts to answer with:

| Topic | Fact |
|---|---|
| Violence, sexual content, gambling | The app itself has none; users may raise any topic in their own words |
| Language | **Yes, crude language**: onboarding copy says "whatever the fuck you want" and "bullshit", and AI replies can mirror swearing |
| Drugs / alcohol / self-harm themes | Users may discuss them; the AI responds supportively and shows crisis contacts (Lifeline, 13YARN, Triple Zero) for immediate risk |
| User-to-user interaction / sharing | None — private one-to-one with the AI |
| Location sharing | No |
| Digital purchases | Yes (subscription) |
| Unrestricted internet access | No |

Expect a mature rating because of language and themes. That suits the 18+
audience **[Wayne: confirm]**.

## Apple — App Privacy ("nutrition label")

**Data linked to the user** (none used for tracking; no third-party
advertising):

| Apple category | Type | Purpose |
|---|---|---|
| Contact Info | Email Address | App Functionality |
| User Content | Audio Data | App Functionality |
| User Content | Other User Content (transcripts, replies) | App Functionality |
| Purchases | Purchase History | App Functionality |
| Identifiers | User ID | App Functionality |
| Usage Data | Product Interaction (usage counts) | App Functionality (fair use) **[verify best-fit purpose]** |

"Data used to track you": **None.**

## Apple — Age rating — preparation

Same facts as IARC. Profanity/crude humour: present (frequent/intense
depends on Apple's wording — app copy uses it deliberately). Mature
themes: users may discuss self-harm and substances; crisis guidance shown.
Medical/treatment information: none provided. Apple's 2026 questionnaire
also asks about AI-generated content and social features — answer: AI
replies yes; no social/sharing features **[verify current questions]**.

## Still needed before any of these can be submitted

1. Web account-deletion request page (Google requirement).
2. Published Privacy Policy URL and support email.
3. Reviewer demo account with an active subscription and seeded fictional
   conversations.
4. Vendor confirmations marked **[verify]** (OpenAI, Anthropic, RevenueCat,
   Supabase retention and processing locations).
5. Legal review of the health-info and health-apps answers.
