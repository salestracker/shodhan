import { createClient } from '@supabase/supabase-js';


// Initialize Supabase client
// Using direct values from project configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };
