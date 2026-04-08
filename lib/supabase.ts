import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Guard against empty strings to prevent build-time crashes (especially during Next.js prerendering)
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'development') {
    console.error('CRITICAL: Supabase URL or Anon Key is missing. Check your .env file.');
  }
}

// Ensure we don't call createClient with invalid/empty credentials during build phase
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any; // Cast as any to avoid type errors in parts of the app that don't run during build
