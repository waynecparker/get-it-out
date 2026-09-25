# Get It Out — Brand & Product Foundation (approved 2026-09-25)

Approved by Wayne. This is the working brand and product foundation agreed
before starting Checkpoint 5.5 / Checkpoint 6. **Documentation only** — no
application code, UI copy, prompts, colours or assets have been changed to
match this yet. See "Pending decisions" at the end for what still needs to
be settled before implementation.

## Working brand

- **Product name:** Get It Out
- **Primary tagline:** Say what's on your mind.
- **Descriptor:** Your mobile mate when you need to get it out.
- **Experience promise:** Your mobile mate who listens first.
- **Method:** Release. Reflect. Respond.
- **Creator attribution:** Created by Wayne Parker — The Mindset Man
- **AI attribution:** AI-powered responses shaped by Wayne Parker's direct, grounded coaching approach.

## Current launch flow (unchanged)

Record and confirm with "Yep, that's it," then choose:

- **Let me vent** → Release
- **Help me unpack it** → Reflect
- **What can I do?** → Respond

This maps the existing three response modes onto the new Release / Reflect
/ Respond method naming — the underlying mode behaviour (vent/unpack/action
in `src/constants/response-modes.ts` and the system prompt) is not changing
as part of this document.

## Product positioning

Get It Out is a voice-first reflection companion that listens before it
guides. It gives people a private place to speak freely, hear themselves
more clearly and choose what they need next. It is not positioned as
therapy, an emergency service, or a replacement for real human support.

## Launch use cases

- Work through difficult moments.
- Rehearse a real conversation.
- Capture wins and good moments.
- Clear the day's mental load.

## Future roadmap only — not approved for development

- Daily Clear-Out
- Practice It Here
- The Good Stuff
- Daily Direction
- Coaching Connection (with explicit per-item user consent)

None of these are scheduled to a checkpoint. Do not start building any of
them without a separate, explicit approval.

## Campaign-copy bank

- Say it here before you say it over there.
- Get it out here before it comes out somewhere else.
- Sometimes you need to hear yourself say it.
- Get it out of your head so you're ready for bed.
- Put the day down before you lie down.
- A nightly head dump — no pen required.
- Better out than in.
- **Raw Wayne campaign option:** Get it out here so you don't fuck it up over there.

This is marketing/campaign material, not in-app UI copy — none of it has
been applied to onboarding, store listings, or any screen yet.

## Pending decisions before implementation

1. Verify "Get It Out" availability (name/trademark/domain/store listing) — **still open.**
2. ~~Final colours and visual direction~~ — **resolved**, see
   `docs/visual-identity.md`.
3. ~~Icon and splash concept~~ — **resolved**, see `docs/visual-identity.md`
   (six decisions: colour palette, icon treatment, splash composition,
   light/dark handling, attribution placement, asset sizes/formats).
4. Review the four onboarding screens
   (`src/app/onboarding/index.tsx`) against this brand foundation — **still open.**

Once all four are settled, Wayne will give one approved Checkpoint 5.5
brief covering the actual code/asset changes.

## Status

Checkpoint 5 (commit `7745042`) remains frozen. No Checkpoint 5.5 or
Checkpoint 6 work has started.
