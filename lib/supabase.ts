
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Hardcoded credentials provided by the user
const SUPABASE_URL = 'https://dbppxzkkgdtnmikkviyt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EK1SAhvQC5RvjagfJR7NLA_TaqRCpnx';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (customUrl?: string, customKey?: string): SupabaseClient | null => {
  // Use custom parameters if provided, otherwise use hardcoded constants
  const url = customUrl || SUPABASE_URL;
  const key = customKey || SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  if (!supabaseInstance || customUrl) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  
  return supabaseInstance;
};

export const saveSupabaseCredentials = (url: string, key: string) => {
  localStorage.setItem('SUPABASE_URL', url);
  localStorage.setItem('SUPABASE_ANON_KEY', key);
  supabaseInstance = null;
};

export const clearSupabaseCredentials = () => {
  localStorage.removeItem('SUPABASE_URL');
  localStorage.removeItem('SUPABASE_ANON_KEY');
  supabaseInstance = null;
};
