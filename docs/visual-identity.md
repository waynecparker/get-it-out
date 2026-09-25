# Get It Out — Visual Identity (approved 2026-09-25)

Approved by Wayne. Six brand-direction decisions made against the
foundation in `docs/brand-foundation.md`, working from the constraint that
Get It Out is a broader standalone brand connected to Wayne Parker — The
Mindset Man, but should not visually mirror it. **Documentation only** — no
application code, configuration, colours or image assets have been changed
to match this yet. This feeds into a single, separately-approved Checkpoint
5.5 implementation brief.

## 1. Colour palette — "Midnight Copper"

Deep navy-charcoal base, one strong copper accent, warm off-white text. No
teal in the core palette (held in reserve as a possible future secondary
accent, not part of this identity). All contrast ratios below are computed
(WCAG relative-luminance formula), not estimated.

| Token | Hex | Contrast vs background |
|---|---|---|
| Background | `#10131A` | — |
| Background elevated | `#171B24` | — |
| Background element | `#20242F` | — |
| Border | `#2E3441` | — |
| Text primary | `#F2F1EC` | 16.43:1 (AAA) |
| Text secondary | `#A7ADBB` | 8.26:1 (AAA) |
| Text muted | `#7A8291` | 4.80:1 (AA) |
| Accent (copper) | `#C77A3B` | 5.55:1 as text/icon; 5.41:1 with near-black text on a filled button |
| Accent pressed | `#A8632C` | — |
| Safety/danger | `#D3594B` | 4.69:1 (AA) |

Supersedes the explicitly-placeholder palette currently in
`src/constants/theme.ts`.

## 2. App-icon treatment

Concept (approved, still needing artwork refinement before a final
production asset): a large, clean human head silhouette in profile, angled
upward toward the right, little or no neck, no ear/eye/eyebrow/internal
facial detail. Inside the head, the letters **Z–X–Y** sit jumbled and
slightly angled. From the mouth, a short two-line speech/trumpet shape
rises diagonally, carrying **X–Y–Z** small to large. Meaning: speaking gets
jumbled thoughts out and puts them into order.

Colour assignment:
- **Head:** solid off-white (`#F2F1EC`) fill.
- **Internal Z–X–Y:** navy (`#10131A`) negative-space cutouts through the
  off-white head — not separately coloured letters sitting on top.
- **Speech/trumpet shape + outgoing X–Y–Z:** solid copper (`#C77A3B`).

Rationale: off-white-on-navy is the highest-contrast pairing in the
palette, so the silhouette itself — the thing that has to register
instantly at small sizes — gets the clearest treatment. Copper is spent
on exactly one element, the outgoing speech mark, giving the accent colour
semantic meaning (the moment of getting it out) rather than just
decorating the whole mark.

**Two-tier system:**
- **Full-detail** (silhouette + internal jumbled letters + speech-mark
  output) — used for the app icon, store listing icon, and splash screen.
- **Simplified** (silhouette + speech mark only, internal letters dropped)
  — used only where renders are genuinely tiny: the web favicon and
  Android's monochrome/themed-icon layer.

## 3. Splash-screen composition

Mark only — full-detail tier, centred, on the palette's core background
(`#10131A`) for a seamless hand-off into the app's own background. No
wordmark, no tagline, no loading spinner, no animation (matches both
Apple's and Android's platform convention that a splash/launch screen is a
brief transitional state, not a marketing moment; also avoids locking in a
typeface before one has been chosen for anything else). Scale: roughly
25–30% of screen width, up from the current placeholder's small
`imageWidth: 76` — final exact figure tuned during implementation. Keep the
existing simple fade already implemented via `SplashScreen.hideAsync()` in
`src/app/_layout.tsx` — no added animation.

## 4. Light and dark background versions

Ship **one** full-colour navy icon treatment for launch, used wherever the
standard icon is required (iOS default, and the App Store / Play Store
listing icon). The approved simplified monochrome/themed-icon layer for
Android (see §2) is retained and already covers the "works in any system
theme" requirement on that platform.

An inverted variant (warm off-white/cream background, navy head, copper
mark) — for iOS's optional alternate-appearance "Light" icon slot, or for
a possible future in-app light mode — is **documented as deferred future
work only**. Not created, not implemented, not scheduled to a checkpoint.

## 5. Creator attribution placement

Two lines from `docs/brand-foundation.md`:
- Created by Wayne Parker — The Mindset Man
- AI-powered responses shaped by Wayne Parker's direct, grounded coaching approach.

**In-app:** both lines, as plain text, in **Settings → About** (the
existing ABOUT section in `src/app/(tabs)/settings.tsx`). A future optional
tappable link to `waynecparker.com` is noted as deferred work, not
implemented now.

**External:** the creator attribution also appears naturally in the App
Store and Play Store descriptions. Note that each store's own
Developer/Seller field will reflect whichever legal entity owns that
developer account, not necessarily "Wayne Parker" as free text — that's a
platform-level fact, not something copy can override.

**Kept out of:** onboarding, the splash screen, the icon, and the core
conversation UI (Talk screen, History, message bubbles) — consistent with
Get It Out not visually mirroring The Mindset Man.

## 6. Final asset sizes/formats

Verified against the current SDK 57 docs (`docs.expo.dev/versions/v57.0.0`)
rather than assumed. Expo generates every platform-specific derived size
from a single master file per layer — no manual multi-resolution export
matrix is needed.

**Five raster files** (not six — the Android adaptive-icon background is a
configured colour value, not an image):

| File (`app.json` field) | Size / format | Content |
|---|---|---|
| `icon.png` | 1024×1024 PNG, full-bleed, no transparency | Full-detail mark on the navy background — serves iOS, the general fallback, and the Play Store listing icon |
| `android-icon-foreground.png` | 1024×1024 PNG, **transparent** background | Full-detail mark only, centred within the adaptive-icon safe zone (roughly the inner two-thirds of the canvas) so OEM launcher masks don't clip it — the navy comes from the background colour below, not baked into this file |
| `android-icon-monochrome.png` | 1024×1024 PNG, single colour/alpha | Simplified mark only (silhouette + speech shape, no internal letters) |
| `splash-icon.png` | 1024×1024 PNG, **transparent** background | Full-detail mark only — no navy rounded-square background baked in; the splash's navy comes from the separate `backgroundColor` config, not this image |
| `favicon.png` (web) | Small PNG, 48×48 is the conventional size (no strict spec in the docs) | Simplified mark |

**Not a file:** the Android adaptive-icon background — configured as the
flat colour `#10131A` directly in `app.json`, not a raster asset.

**Explicitly out of scope for this pass:** the Google Play feature graphic
(1024×500), store screenshots, and any other store-listing marketing
assets — those belong with the broader store-preparation work, not this
icon/splash identity pass.

## Status

Checkpoint 5 (commit `7745042`) remains frozen. All six decisions above are
approved as brand direction. No code, configuration, colours, or image
assets have been changed yet — implementation is pending one consolidated
Checkpoint 5.5 brief.
