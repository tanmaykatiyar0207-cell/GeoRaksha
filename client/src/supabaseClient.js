import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase project URL and Anon Key
// You can find these in your Supabase Dashboard -> Settings -> API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xvvxftgxgytuednnctgv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1Uhgt-gpxb2JB3A7i7QnOQ_OGomEJtQ';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
