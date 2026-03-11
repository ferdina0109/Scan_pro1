import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

let cached;

export function getSupabase() {
  if (!cached) {
    cached = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"));
  }
  return cached;
}
