import { createClient } from "@supabase/supabase-js";

// Anon client — safe to use in both client and server components.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
