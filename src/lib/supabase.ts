import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] as string;
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. ' +
      'Cloud sync is disabled. Add them to .env.local to enable.'
  );
}

/** True when the Supabase env vars are present and the client can be used. */
export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

// Typed as `any` for the runtime reference so JSONB upserts don't fight TS generics.
// All auth methods are still safe — we cast back to the real type in AuthContext.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = supabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
