"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  role: "user" | "author" | "admin";
  isBlacklisted: boolean;
}

const signedOutState: AuthContextType = {
  user: null,
  loading: false,
  isAdmin: false,
  role: "user",
  isBlacklisted: false,
};

const AuthContext = createContext<AuthContextType>({
  ...signedOutState,
  loading: true,
});

const resolveAccess = (data: Record<string, unknown> | undefined, emailRestricted: boolean) => {
  const isBlacklisted = emailRestricted || data?.blacklisted === true;
  // A blacklisted account never keeps elevated access, whatever its stored role is.
  const role: AuthContextType["role"] = isBlacklisted
    ? "user"
    : data?.role === "author"
      ? "author"
      : data?.admin === true
        ? "admin"
        : "user";
  return { role, isAdmin: role === "admin" || role === "author", isBlacklisted };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthContextType>({
    ...signedOutState,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    let authSequence = 0;
    let unsubscribeWatchers: Array<() => void> = [];
    const stopWatchers = () => {
      unsubscribeWatchers.forEach((stop) => stop());
      unsubscribeWatchers = [];
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const sequence = ++authSequence;
      stopWatchers();

      if (!user) {
        if (active && sequence === authSequence) {
          setAuthState(signedOutState);
        }
        return;
      }

      try {
        // Firestore is intentionally loaded only for signed-in users. Public visitors
        // should not pay the download and initialization cost during first paint.
        const [
          { doc, getDoc, setDoc, onSnapshot, serverTimestamp, increment },
          { db },
          { RESTRICTED_EMAILS_COLLECTION, restrictedEmailKey },
        ] = await Promise.all([
          import("firebase/firestore"),
          import("@/firebase/db"),
          import("@/firebase/restricted-email"),
        ]);
        const userDocRef = doc(db, "users", user.uid);
        const emailDocRef = user.email
          ? doc(db, RESTRICTED_EMAILS_COLLECTION, restrictedEmailKey(user.email))
          : null;
        const [userDoc, emailDoc] = await Promise.all([
          getDoc(userDocRef),
          emailDocRef ? getDoc(emailDocRef).catch(() => null) : Promise.resolve(null),
        ]);

        if (userDoc.exists()) {
          // Google/Firebase Auth is the source of truth for account identity.
          // Keep the Firestore profile aligned without touching user-entered fields such as phone.
          await setDoc(userDocRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          }, { merge: true });
        } else {
          await setDoc(userDocRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            admin: false,
            role: "user",
            createdAt: new Date(),
          });
        }

        if (!active || sequence !== authSequence) return;

        let profileData = userDoc.data();
        let emailRestricted = Boolean(emailDoc?.exists());
        const publish = () => {
          if (active && sequence === authSequence) {
            setAuthState({ user, loading: false, ...resolveAccess(profileData, emailRestricted) });
          }
        };
        publish();

        // Record the login so admins can see restricted emails that are still signing in.
        let loginRecorded = false;
        const recordRestrictedLogin = () => {
          if (!emailDocRef || loginRecorded) return;
          loginRecorded = true;
          setDoc(emailDocRef, {
            lastLoginAt: serverTimestamp(),
            lastLoginUid: user.uid,
            loginAttempts: increment(1),
          }, { merge: true }).catch((error) =>
            console.error("Unable to record the restricted login:", error)
          );
        };
        if (emailRestricted) recordRestrictedLogin();

        // Watch the profile and the email restriction so changes apply without a reload.
        unsubscribeWatchers.push(onSnapshot(
          userDocRef,
          (snapshot) => {
            profileData = snapshot.data();
            publish();
          },
          (error) => console.error("Unable to watch the user profile:", error)
        ));
        if (emailDocRef) {
          unsubscribeWatchers.push(onSnapshot(
            emailDocRef,
            (snapshot) => {
              emailRestricted = snapshot.exists();
              if (emailRestricted) recordRestrictedLogin();
              publish();
            },
            (error) => console.error("Unable to watch the email restriction:", error)
          ));
        }
      } catch (error) {
        console.error("Unable to load the user profile:", error);
        if (active && sequence === authSequence) {
          setAuthState({ ...signedOutState, user });
        }
      }
    });

    return () => {
      active = false;
      stopWatchers();
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
