// Minimal event bus to let VoiceOrb notify NotesScreen when a transcript is saved.
const listeners = new Set();

export function subscribeNotes(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyNotesChanged() {
  listeners.forEach((fn) => fn());
}
