import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ── App Check ────────────────────────────────────────────────────────────────
// Proves requests come from this site (reCAPTCHA Enterprise) so Firebase AI Logic and
// Storage can reject calls made with a copied config. Browser only: this module is also
// imported by server code, which has no reCAPTCHA. Initialized here, on first import,
// so every Firebase product used afterwards attaches the token.

declare global {
  // Read by the App Check SDK.
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

const appCheckSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
let appCheck: AppCheck | null = null;

if (typeof window !== "undefined" && appCheckSiteKey) {
  // Local development: reCAPTCHA can't attest localhost, so use a debug token
  // registered in Firebase console → App Check → Apps → Manage debug tokens.
  // "true" makes the SDK print a new token in the browser console to register.
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (process.env.NODE_ENV !== "production" && debugToken) {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === "true" ? true : debugToken;
  }
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

/** True when App Check is active in this browser (Firebase AI Logic refuses to run without it). */
const appCheckEnabled = () => appCheck !== null;

export { app, auth, googleProvider, appCheckEnabled };
