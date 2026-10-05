// Restricted emails live in `restrictedEmails/{email}` so a restriction follows the
// email address even if the user's profile document is deleted and recreated.
// The document id is the plain lower-cased email, so Firestore security rules can
// look it up from `request.auth.token.email` (see firebase/firestore.rules).
export const RESTRICTED_EMAILS_COLLECTION = "restrictedEmails";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const restrictedEmailKey = (email: string) => normalizeEmail(email);

/** Ids written by the first version (URL-encoded), so old entries can still be removed */
export const legacyRestrictedEmailKey = (email: string) =>
  encodeURIComponent(normalizeEmail(email));
