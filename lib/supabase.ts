import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// In our case, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY seems to be what was placed in .env.local
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check .env.local variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
