"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/firebase";

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
        // Firestore is intentionally loaded only for signed-in users. Public visitors
        // should not pay the download and initialization cost during first paint.
        const [{ doc, getDoc, setDoc }, { db }] = await Promise.all([
          import("firebase/firestore"),
          import("@/firebase/db"),
        ]);
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        let isAdmin = false;
        let role: AuthContextType["role"] = "user";

        if (userDoc.exists()) {
          const data = userDoc.data();
          role = data.role === "author" ? "author" : data.admin === true ? "admin" : "user";
          isAdmin = role === "admin" || role === "author";
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
