import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail.");
}

/**
 * Dedicated Admin client for server-side operations that bypass RLS.
 * USE WITH CAUTION.
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
