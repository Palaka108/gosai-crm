import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qwlbbcrjdpuxkavwyjyg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bGJiY3JqZHB1eGthdnd5anlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NTU2MTgsImV4cCI6MjA3ODIzMTYxOH0.u9Pzx715-Xtbg2I7t-IBrYnj-0lgnwqqOkTcge69JWE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
