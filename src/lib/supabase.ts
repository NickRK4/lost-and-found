import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
let supabaseClient: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  
  // Only initialize if both URL and key are available
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (typeof window !== 'undefined') {
      console.error('Supabase URL or Anonymous Key is missing');
    }
    return null;
  }
  
  // Initialize the client
  supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'supabase.auth.token',
      }
    }
  );
  
  return supabaseClient;
};

// Create a singleton that's safe for SSR
export const supabase = typeof window !== 'undefined' 
  ? getSupabase() 
  : null;