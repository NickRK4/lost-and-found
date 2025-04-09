import { getSupabase } from './supabase';

/**
 * Safely get the Supabase client, with proper null checking
 * This function should be used in client components to ensure Supabase is initialized
 */
export function getSafeSupabaseClient() {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase client not initialized. Make sure environment variables are set correctly.');
  }
  return client;
}

/**
 * Check if the code is running on the client side
 */
export function isClient() {
  return typeof window !== 'undefined';
}
