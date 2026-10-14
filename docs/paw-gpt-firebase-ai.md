# Paw GPT on Firebase AI Logic (Gemini) + App Check

Paw GPT can run on either backend. `NEXT_PUBLIC_PAW_GPT_PROVIDER` picks one:

| Value | Backend | Where it runs |
| --- | --- | --- |
| *(unset)* / `anthropic` | `/api/paw-gpt`: Anthropic, server-side | Netlify function |
| `firebase-ai` | Firebase AI Logic, Gemini Developer API | Browser → Firebase, through a **server prompt template** |

Switch only after steps 1–4 are done. The Anthropic route stays in place as a fallback until
Gemini has been verified in production.

## Why a server prompt template

AI Logic is called from the browser, so anything the browser sends can be changed by a user.
With a template ([firebase/ai-templates/paw-gpt.prompt](../firebase/ai-templates/paw-gpt.prompt))
the system prompt, model and output limits are stored in Firebase, and the browser can only
fill in three variables: `petRecord`, `conversation` and `question`. Without a template, anyone
could rewrite the prompt and use the quota as a general-purpose chatbot.

## 1. App Check with reCAPTCHA Enterprise

1. Firebase console → **App Check** → **Apps** → select the web app → **reCAPTCHA Enterprise**.
2. Create a key (or let Firebase create one) for the domains `pawsattva.com`,
   `www.pawsattva.com` and your Netlify domain (`*.netlify.app` if you use deploy previews).
3. Copy the **site key**. It is public, because it ships to the browser.
4. Netlify and `.env`: `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY=<site key>`.

**Local development.** reCAPTCHA can't attest `localhost`:

1. Add `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=true` to `.env` (development only; it is
   ignored in production builds).
2. Open the site and copy the debug token printed in the browser console.
3. Register it: App Check → Apps → ⋮ → **Manage debug tokens**.
4. Optionally replace `true` with that token in `.env` so it stays the same.

Never register debug tokens for production or commit them.

## 2. Prompt template

Firebase console → **AI Logic** → **Prompt templates** → create a template with:

- **ID:** `paw-gpt-v1`, or set `NEXT_PUBLIC_PAW_GPT_TEMPLATE_ID`.
- **Content:** paste [firebase/ai-templates/paw-gpt.prompt](../firebase/ai-templates/paw-gpt.prompt).
- **Model:** pick a current Gemini model from the console list. The file says
  `gemini-2.5-flash`; change it if the console offers a newer recommended one.

Test it in the console's template playground with a sample `petRecord`.

## 3. Limits

In **AI Logic → Settings**:

- Set the **per-user rate limit** (requests per minute). This replaces the old server
  limit of 25 requests per 10 minutes per user.
- Set a budget alert on the Google Cloud project for the Gemini API.

## 4. Enforcement (in this order)

1. Deploy with the site key set and leave it for a day or two.
2. App Check → **APIs** → check the request metrics. Most requests should be **verified**.
3. **Firebase AI Logic → Enforce.**
4. **Storage: check before enforcing.** Every blog image is a Storage download URL, and
   those are also fetched by things that can't send App Check tokens: Next's image optimizer
   on the server, Instagram publishing and social-media link previews. If the Storage metrics
   show a lot of *unverified* traffic after the site key is live, **don't enforce Storage**,
   because images would stop loading. Uploads are already restricted by Storage security rules.
5. **Don't enforce Firestore.** `/api/blog/view`, `/api/blog/react` and the Paw GPT auth
   check call Firestore from the server without App Check and would break.

Enforcement is a switch in the console and can be turned off again immediately if anything
breaks.

## 5. Switch Paw GPT

Netlify: `NEXT_PUBLIC_PAW_GPT_PROVIDER=firebase-ai`, then redeploy (`NEXT_PUBLIC_` values
are fixed at build time). To roll back, remove the variable and redeploy.

If App Check isn't configured, Paw GPT refuses to call Gemini and shows "Paw GPT isn't
available right now" instead of making unprotected requests.

## Daily limits (both backends)

Each pet parent gets **5 questions** and **100,000 tokens** per India calendar day. Admins and
authors are **counted but never limited**, so the totals show real usage. Usage is stored in
`users/{uid}/pawGptUsage/{YYYY-M-D}` as `count`, `tokens`, `inputTokens` and `outputTokens`.
It's shown in the chat (dock → "Today's usage", and next to the send button) and across all
users in **Admin › Analytics › Paw GPT usage**: today's totals, a 14-day input/output chart,
average tokens per question, and today's top users.

The admin view uses a collection-group query that needs an index on `pawGptUsage.updatedAt`.
Deploy [firebase/firestore.indexes.json](../firebase/firestore.indexes.json)
(`firebase deploy --only firestore:indexes`), or open the link Firestore prints in the
browser console the first time the view loads.

**Estimating cost:** multiply input and output tokens by Anthropic's current per-token prices
for the model in `app/api/paw-gpt/route.ts`. Input includes the cached pet record, and cached
reads are billed at a lower rate, so this gives an upper bound.

- **Firestore rules enforce it.** A question can only start (`count + 1`) while
  `count < 5` and `tokens < 100000`. `tokens` can only go up, and users can't delete or
  reset the document.
- **Anthropic route:** the server increments `count` before answering and records the
  answer's real token usage (input, including the cached pet record, plus output) when the
  stream ends. A user can't skip this.
- **Firebase AI:** the browser does both writes (`count` before, `usageMetadata.totalTokenCount`
  after). Someone who calls AI Logic directly could skip them, so App Check and the AI Logic
  per-user rate limit are the real backstop on that path.
- A question that fails or is stopped still counts, along with the tokens it used.
- To change the limits, update `PAW_GPT_DAILY_LIMIT` / `PAW_GPT_DAILY_TOKEN_LIMIT` in
  `lib/paw-gpt.ts` **and** the matching numbers in `firebase/firestore.rules`, then deploy
  the rules **before** the app. Without the rules, every non-admin gets "Paw GPT isn't
  available".

## What changes compared with the Anthropic route

| | Anthropic route | Firebase AI Logic |
| --- | --- | --- |
| Signed-in check | Verified on the server | UI only. AI Logic doesn't check Firebase Auth; App Check proves the request came from the real site, not who is using it |
| Blacklisted users | Refused by the server | Blocked in the UI only |
| Rate limit | 25 per 10 min per user, per instance | AI Logic per-user limit (console) |
| Prompt and model | Server code | Template in the Firebase console |
| Pet data sent to | Anthropic | Google (Gemini Developer API) |

The pet record is the owner's own data, built in their browser either way.
