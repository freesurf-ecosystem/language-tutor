// Public (non-secret) runtime config for the English tutor redesign.
// Read from EXPO_PUBLIC_* env (inlined at build). Fallbacks keep it runnable without a .env.

export const Config = {
  workerUrl:
    process.env.EXPO_PUBLIC_WORKER_URL ??
    "https://freesurf-language-tutor.freesurf.workers.dev",
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "https://jstojewashwoswsskwjk.supabase.co",
  supabasePublishableKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "sb_publishable_-nyuPas2pnqOcHMNJUCHog_xUlJbtuU",
};

// The AI brain contract (request/response) is documented in ../docs/TUTOR_AI_PIPELINE.md
