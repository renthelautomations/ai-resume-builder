import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.error("CRITICAL: Supabase credentials not found in environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
