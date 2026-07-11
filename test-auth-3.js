import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { error } = await supabase.auth.getUser("");
  console.log("Empty string error:", error?.message);
  
  const { error: err2 } = await supabase.auth.getUser(undefined);
  console.log("Undefined error:", err2?.message);
}
run();
