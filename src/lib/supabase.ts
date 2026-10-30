import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Anahtarlar tanımlı değilse null: uygulama yerel demo modunda çalışır. */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export const isRemote = supabase !== null;
