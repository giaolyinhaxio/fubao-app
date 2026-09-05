const SUPABASE_URL =
    "https://mechpxxpxzatuaxizcuu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_pX_oK3TyjyqKagi0mjtLNQ_FYxa4WEb";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );