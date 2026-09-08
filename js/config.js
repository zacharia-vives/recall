// Where the cloud lives. Empty means the app runs local only, which is the
// default and which is requirement P1.
//
// The anon key is designed to be public and shipping it in a public repo is
// normal: everything that matters is enforced by row level security in the
// database. The service_role key must never appear here.
//
// The project sits in the Frankfurt region. Verified on 8 September 2026 that an
// unauthenticated request with this key cannot write anything: every table and
// the photo bucket answer with a row level security violation. That is what
// makes it safe to publish.

export const SUPABASE_URL = "https://xoczuvvxengzkcxybfbx.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvY3p1dnZ4ZW5nemtjeHliZmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NDM5ODcsImV4cCI6MjEwNDQxOTk4N30.nJP2cRyzwP7YunkTremJc6ioYauadBpYk0ptkgwCmpo";

// Bumped whenever the wording of the consent screen changes, so a recorded
// consent always points at the text that was actually read out (P19).
export const NOTICE_VERSION = "2026-09-08";

export function isConfigured() {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
