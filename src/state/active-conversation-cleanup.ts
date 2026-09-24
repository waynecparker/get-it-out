// A tiny non-React registry so sign-out (triggered from the Settings tab,
// which has no access to the Talk tab's local component state) can still
// discard an in-progress unsaved conversation's local temp audio files
// before it signs out. Not a context — nothing here needs to re-render.

let cleanup: (() => void) | null = null;

export function registerActiveConversationCleanup(fn: (() => void) | null) {
  cleanup = fn;
}

export function runActiveConversationCleanup() {
  cleanup?.();
}
