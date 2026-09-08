// Where the cloud lives. Empty means the app runs local only, which is the
// default and which is requirement P1.
//
// The anon key is designed to be public and shipping it in a public repo is
// normal: everything that matters is enforced by row level security in the
// database. The service_role key must never appear here.
//
// Fill these in with the values from Supabase, Settings, API, of a project in
// the Frankfurt region.

export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

// Bumped whenever the wording of the consent screen changes, so a recorded
// consent always points at the text that was actually read out (P19).
export const NOTICE_VERSION = "2026-09-08";

export function isConfigured() {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
