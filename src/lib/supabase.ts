import { createClient } from '@supabase/supabase-js';


// Initialize Supabase client
// Using direct values from project configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wknkboycyrjignymnjyb.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrbmtib3ljeXJqaWdueW1uanliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNjMxOTYsImV4cCI6MjA2NTYzOTE5Nn0.Enx1kS58H62Tm8GWoF2FfHjtUdF-R2fpaaNHLvSMTtk';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };
