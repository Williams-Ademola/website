# Hub setup (Shiftbook + private semester page)

Login and Shiftbook data run on a free Supabase project. One-time setup, about 15 minutes.

1. **Create the project.** supabase.com → New project (free plan). Pick a region near Winnipeg (Canada Central or US East).
2. **Create the table.** SQL Editor → New query → paste all of `supabase/shiftbook.sql` → Run. Safe to run again later.
3. **Make it invite-only.** Authentication → Sign In / Providers:
   - turn **off** "Allow new users to sign up"
   - under Email, turn **off** "Confirm email" (you create accounts yourself, so no emails get sent)
4. **Create accounts.** Authentication → Users → Add user → Create new user. Enter the email and a temporary password, tick **Auto Confirm User**. Do this for yourself and each person. They can change their password in Shiftbook (calendar icon → Account).
   - Forgot password: same screen, click the user → reset or set a new password.
   - Removing someone: delete the user; their Shiftbook data is deleted with them.
5. **Connect the site.** Project Settings → API Keys. In Vercel → personal-website → Settings → Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the publishable key (`sb_publishable_...`). The legacy anon key also works, as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - `OWNER_EMAIL` = your login email (only this account sees the semester page)
   - optional `SHIFTBOOK_DEFAULT_TZ` (default `America/Winnipeg`)

   Then redeploy.
6. **Bring your old Shiftbook data over.** Sign in at `/login` → Shiftbook → calendar icon → Import backup → pick `shiftbook-backup-william.json`.

## What lives where

- `/hub`: private landing page. `/semester` now redirects to `/hub/semester` (owner only). The old sync key still works for the semester API, but signed in as the owner you don't need it.
- `/hub/shiftbook`: one row per person in `shiftbook_state`; row-level security means each person can only read and write their own.
- `/api/shiftbook/calendar/<token>.ics`: each person's private calendar feed. "Make a new link" in Shiftbook replaces the token and stops the old link.

Free Supabase projects pause after a week with no activity. Calendar apps check the feed every few hours, which normally keeps it awake; if it ever pauses, hit Restore in the Supabase dashboard.
