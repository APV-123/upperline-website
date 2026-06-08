import { createClient } from '@supabase/supabase-js';

let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  if (!_supabase) {
    _supabase = createClient(url, key);
  }

  return _supabase;
}