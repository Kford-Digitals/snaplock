// js/config.js
const SUPABASE_URL = "https://ubsktyaaygnzkakwtkel.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1vd3f0GnqdioHSkpd685lQ_kjwYzcr1";
const PAYSTACK_PUBLIC_KEY = "pk_test_c4606a5f446d7a549e821ad4339bc78c66556e97";

// Initialize Supabase Client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
