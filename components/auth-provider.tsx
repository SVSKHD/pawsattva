"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/firebase";
import { getUserProfile, migrateLegacyUserProfile, upsertUserIdentity } from "@/firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  role: "user" | "author" | "admin";
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  role: "user",
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    role: "user",
  });

  useEffect(() => {
    let active = true;
    let authSequence = 0;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const sequence = ++authSequence;
      if (!user) {
        if (active && sequence === authSequence) {
          setAuthState({ user: null, loading: false, isAdmin: false, role: "user" });
        }
        return;
      }

      try {
        // Firebase remains the identity provider. The profile/data backend can now
        // be Supabase (with a Firestore fallback until the cutover is complete).
        let profile = await getUserProfile(user.uid);

        if (!profile) {
          // Copy the user's existing Firestore profile the first time they log in
          // after Supabase is enabled. This preserves phone, PetFeed history and drafts.
          await migrateLegacyUserProfile(user.uid);
          await upsertUserIdentity(user.uid, {
            email: user.email ?? "",
            displayName: user.displayName ?? undefined,
            photoURL: user.photoURL ?? undefined,
          });
          profile = await getUserProfile(user.uid);
        } else {
          await upsertUserIdentity(user.uid, {
            email: user.email ?? profile.email,
            displayName: user.displayName ?? profile.displayName,
            photoURL: user.photoURL ?? profile.photoURL,
          });
        }

        const role: AuthContextType["role"] =
          profile?.role === "author"
            ? "author"
            : profile?.role === "admin" || profile?.admin === true
              ? "admin"
              : "user";
        const isAdmin = role === "admin" || role === "author";

        if (active && sequence === authSequence) {
          setAuthState({ user, loading: false, isAdmin, role });
        }
      } catch (error) {
        console.error("Unable to load the user profile:", error);
        if (active && sequence === authSequence) {
          setAuthState({ user, loading: false, isAdmin: false, role: "user" });
        }
      }
    });

    return () => {
      active = false;
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
