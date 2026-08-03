// js/config.js
const SUPABASE_URL = "https://ubsktyaaygnzkakwtkel.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1vd3f0GnqdioHSkpd685lQ_kjwYzcr1";
const PAYSTACK_PUBLIC_KEY = "pk_live_84428d1743617cc38a3ca1aa151a81e4cc57f3f7";

// Initialize Supabase Client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
