import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  || "https://ffrelmyowtuxuwufbfwr.supabase.co";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  || "sb_publishable_4um1_fKNeEAW4MDNt9fZTA_bhOFPslB";

export const isConfigured = Boolean(
  url && anonKey &&
  !url.includes("YOUR_PROJECT_REF") &&
  !anonKey.includes("YOUR_SUPABASE")
);

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
