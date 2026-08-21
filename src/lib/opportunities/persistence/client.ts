import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { opportunityError } from '../application/errors';

export function createOpportunitySupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw opportunityError('persistence', 'Opportunity persistence is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
