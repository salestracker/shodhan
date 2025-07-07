import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Using direct values from project configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to sign in anonymously
export const signInAnonymously = async () => {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    return null;
  }
};

export { supabase };
