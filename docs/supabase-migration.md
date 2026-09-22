# PawSattva Firebase Auth + Supabase migration

PawSattva keeps Firebase Authentication for Google sign-in while moving application data and media to Supabase.

## Target architecture

- **Firebase Auth**: Google login and Firebase user ID remain the identity source.
- **Supabase Postgres**: profiles and PetFeed data in Phase 1.
- **Supabase Storage**: newly uploaded compressed media in the `media` bucket.
- **Firestore**: temporary fallback for features not cut over yet, and source for first-login profile migration.
- **Firebase Storage**: temporary fallback only when Supabase environment variables are not configured.

This lets the production site migrate incrementally without making existing users create new accounts.

## 1. Create/configure Supabase

Create the Supabase project, then open:

**Authentication -> Third-Party Auth -> Firebase**

Add the existing Firebase Project ID.

Supabase hosted projects validate that Firebase JWTs come from the Firebase project configured in this integration.

## 2. Run the Phase 1 SQL migration

Run:

`supabase/migrations/2026092201_firebase_bridge_phase1.sql`

in the Supabase SQL Editor.

It creates:

- `profiles`
- `pet_feeds`
- Row Level Security policies using the Firebase JWT `sub` claim
- staff-only role management RPC
- public `media` Storage bucket with staff-only writes

Firebase UIDs are stored as `text`, not UUIDs.

## 3. Seed staff roles before production cutover

Client-side migration is deliberately not allowed to copy `admin` or `role` from Firestore because that would let a malicious client promote itself.

After the staff member has signed in once and a Supabase profile exists, promote them from the SQL Editor:

```sql
update public.profiles
set role = 'admin', admin = true, updated_at = now()
where email = 'YOUR_ADMIN_EMAIL';
```

For authors use:

```sql
update public.profiles
set role = 'author', admin = true, updated_at = now()
where email = 'AUTHOR_EMAIL';
```

Do this for the existing PawSattva staff accounts before relying on Supabase-protected admin uploads.

## 4. Recommended Firebase JWT role claim

Supabase recommends the literal Firebase custom claim:

```json
{ "role": "authenticated" }
```

for Firebase users used with Supabase Third-Party Auth.

The Phase 1 RLS policies also key access to the verified Firebase JWT `sub` claim so rollout can be staged, but the authenticated claim should still be added to existing users and automatically assigned for future sign-ins/users.

After adding a claim, force-refresh the Firebase ID token before testing.

## 5. Configure Netlify

Add:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Keep every existing `NEXT_PUBLIC_FIREBASE_*` variable because Firebase Auth is intentionally retained.

Do **not** expose a Supabase secret key in any `NEXT_PUBLIC_*` variable.

## 6. First-login profile migration

When Supabase is configured:

1. User signs in with the existing Google/Firebase flow.
2. PawSattva looks for the Firebase UID in `profiles`.
3. If missing, the user's own legacy Firestore profile is read.
4. Phone, WhatsApp preference, PawSattva update preference, PetFeed history array and PetFeed draft are copied.
5. Google/Firebase identity fields remain the source of truth for name, email and avatar.
6. Future profile/PetFeed writes go to Supabase.

Staff role is not copied client-side; seed it as described above.

## 7. Storage cutover

`lib/image-upload.ts` keeps the existing browser compression flow.

With Supabase configured, compressed images are uploaded to:

```text
media/<folder>/<timestamp>-<uuid>.webp
```

and a public Supabase Storage URL is returned.

If Supabase is not configured, the current Firebase Storage path remains available as a temporary rollback fallback.

## 8. Rollout order

1. Apply Supabase migration SQL.
2. Enable Firebase Third-Party Auth integration in Supabase.
3. Add the Netlify Supabase variables to a Deploy Preview first.
4. Sign in with a normal user and verify profile + PetFeed draft migration.
5. Sign in with staff once, seed their Supabase role, then verify media upload/admin access.
6. Promote the same environment variables to production.
7. After Phase 1 is stable, migrate blogs, comments, categories, SEO, subscriptions and content goals.
8. Remove Firestore/Storage fallback only after the full data copy is verified.

## Rollback

Removing the two `NEXT_PUBLIC_SUPABASE_*` environment variables makes Phase 1 code fall back to the existing Firestore/Firebase Storage paths. No Firebase Auth changes are required.
