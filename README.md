# Get It Out (working name: Men-Tality)

A private, voice-first pressure-release app for men. Not therapy — a place to
say the raw stuff out loud and get a grounded, non-judgmental response.

Built with Expo (TypeScript) + Expo Router, Supabase, and RevenueCat. See
`AGENTS.md` for Expo-specific conventions used in this repo.

## Status

**Checkpoint 1** — visual prototype with mock data. No backend, no real
audio/transcription/AI yet; those land in later checkpoints.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your Android phone.

## Structure

- `src/app/` — screens (Expo Router file-based routing)
- `src/components/` — shared UI (buttons, themed text/view, mic glyph)
- `src/constants/` — theme tokens and mock data
- `src/state/` — in-memory context providers standing in for real
  persistence until Supabase is wired up (Checkpoint 3)
- `src/types/` — shared TypeScript types
