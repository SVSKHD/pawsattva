// Restricted emails live in `restrictedEmails/{key}` so a restriction follows the
// email address even if the user's profile document is deleted and recreated.
export const RESTRICTED_EMAILS_COLLECTION = "restrictedEmails";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Firestore document ids cannot contain "/", so encode the address.
export const restrictedEmailKey = (email: string) =>
  encodeURIComponent(normalizeEmail(email));
