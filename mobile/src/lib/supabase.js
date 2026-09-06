import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Public (publishable) Supabase credentials — safe to embed; not secrets.
const SUPABASE_URL = 'https://jstojewashwoswsskwjk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-nyuPas2pnqOcHMNJUCHog_xUlJbtuU';

const storage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
