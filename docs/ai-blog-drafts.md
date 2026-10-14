# AI blog drafts: ChatGPT intake and moderation

```
ChatGPT action → POST /api/integrations/ai/blog-drafts (API key) → aiBlogDrafts (private)
  → Admin › AI Drafts (review / edit / approve) → Publish → blogs (public)
```

The API key can only **create drafts**. It cannot read, edit, approve or publish anything.
Publishing creates the public `blogs` document, and it can only happen through
`POST /api/admin/ai-drafts/{id}` with `action: "publish"`. That route requires a
Firebase ID token for a full admin (`admin: true`, role not `author`, not blacklisted or
restricted), checked on the server with the Admin SDK.

## Where data lives

| Collection | Who reads | Who writes |
| --- | --- | --- |
| `aiBlogDrafts/{id}` | Full admins (Firestore rules) | Server only (Admin SDK) |
| `aiBlogDrafts/{id}/audit/{event}` | Full admins | Server only, append-only |
| `aiBlogDraftIdempotency`, `integrationRateLimits` | Nobody | Server only |
| `blogs/{id}` | Public (unchanged) | Admins, plus the publish route |

Unpublished drafts stay out of `blogs`. Every document in `blogs` is publicly readable,
so an AI draft only appears there once a moderator publishes it. Published posts carry
`source: "ai-integration"`, `aiDraftId` and `imageAttribution`. The post page shows the
credit line under the featured image.

### Draft lifecycle

`draft → in_review → approved → published`, plus `changes_requested` and `rejected`
(both can be reopened). Allowed moves are listed in `lib/ai-drafts/types.ts`
(`AI_DRAFT_TRANSITIONS`). The server enforces them, and every action is written to the
audit log with the moderator's uid, email and name.

- Editing content after approval moves the draft back to `in_review`.
- Changing the image or its license details clears "image rights confirmed".
- Publishing is blocked until the draft has a slug, at least one category, an author,
  alt text, an image on an allowed host (`lib/image-hosts.ts`, or uploaded through the
  editor), and a moderator's confirmation that the image license allows reuse.

## Server environment variables (Netlify)

Set these under **Site configuration → Environment variables**, scoped to **Functions**
(server runtime). Do **not** prefix them with `NEXT_PUBLIC_`.

| Variable | Purpose |
| --- | --- |
| `PAWSATTVA_DRAFT_API_KEY` | Shared secret for the ChatGPT action. Generate with `openssl rand -base64 48`. |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key. Paste it with literal `\n` sequences or real newlines; surrounding quotes are stripped. |

Use a dedicated service account. The Admin SDK needs Firestore read/write
(`roles/datastore.user`) and token verification (`roles/firebaseauth.viewer`).

To rotate the API key, set a new value in Netlify, redeploy, then update the key in the
ChatGPT action. The old key stops working as soon as the deploy finishes.

## Firestore rules

The new rules are in `firebase/firestore.rules`. Deploy them with
`firebase deploy --only firestore:rules`. Until they are deployed, the AI Drafts tab
shows a load error because admins can't read `aiBlogDrafts` yet.

Optional: add a TTL policy on `integrationRateLimits.expiresAt` so old rate-limit
windows are deleted automatically.

## Connecting ChatGPT (Custom GPT action)

1. In the GPT editor, open **Configure → Actions → Create new action**.
2. **Import from URL:** `https://pawsattva.com/openapi/ai-blog-drafts.yaml`.
3. **Authentication:** API Key, **Auth Type: Bearer**. Paste the value of
   `PAWSATTVA_DRAFT_API_KEY`. ChatGPT stores it encrypted and sends it as a header. Never
   put the key in the GPT's instructions, a prompt, a conversation or this repository.
4. **Privacy policy:** ChatGPT requires a privacy policy URL only for GPTs shared publicly.
   PawSattva doesn't have a `/privacy` page yet, so keep the GPT private ("Only me") or
   add one first.
5. Suggested instructions for the GPT:
   > Write original, accurate pet wellness articles for PawSattva readers in India. Use
   > `<h2>` sections, short paragraphs and practical advice; never give medication doses;
   > tell readers to see a vet for serious symptoms. Use only images whose license allows
   > commercial reuse (Unsplash images from images.unsplash.com are preferred) and always
   > fill `imageAttribution`, including `altText`. Submit with `submitBlogDraft`. A
   > PawSattva moderator reviews every draft, so tell the user the article was submitted for
   > review. Never say it was published.
6. Use **Test** in the action panel. A 201 response with an `id` means the draft is in
   Admin › AI Drafts.

The integration counts as working only after a real authenticated test returns 201 and
the draft appears in the dashboard.

## Testing the deployed endpoint

```bash
URL=https://pawsattva.com/api/integrations/ai/blog-drafts
# 401: missing token
curl -i -X POST "$URL" -H 'Content-Type: application/json' -d '{}'
# 201 / 200 duplicate (read the key from your shell, never paste it into files)
curl -i -X POST "$URL" -H "Authorization: Bearer $PAWSATTVA_DRAFT_API_KEY" \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: test-article-0001' \
  -d @draft.json
```

Mark test drafts clearly (for example a `[TEST]` title prefix) and **reject** them in the
dashboard rather than publishing. Delete them from the Firebase console afterwards,
including the `audit` subcollection.

Local checks: `pnpm test` covers validation, sanitization, workflow rules, body limits
and the route's 400/401/413/415/429 responses.
