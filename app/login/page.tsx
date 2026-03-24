"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { auth, googleProvider } from "@/firebase/firebase";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Signed in successfully!");
      router.push("/");
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/user-not-found") {
        // Try to sign up if user not found (simplified flow)
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          toast.success("Account created successfully!");
          router.push("/");
        } catch (signUpError: any) {
          toast.error(signUpError.message);
        }
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Signed in with Google!");
      router.push("/");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      {/* Background Layer strictly fixed to prevent scrolling issues */}
      <div 
        className="fixed inset-0 w-full h-[100dvh] bg-cover bg-center bg-no-repeat overflow-hidden z-0"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=2500&auto=format&fit=crop')",
        }}
      >
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] pointer-events-none" />
      </div>

      {/* Header Layer (absolute so it doesn't push the flex layout constraints) */}
      <div className="absolute top-0 left-0 w-full z-50">
        <Header />
      </div>

      {/* Interactive Layer explicitly forced to full viewport height for perfect mathematical centering */}
      <div 
        className="relative z-10 w-full flex flex-col justify-center items-center min-vh-[100dvh] p-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)", height: "100dvh" }}
      >
        <Card className="mx-auto w-full max-w-sm border-border/50 bg-background/80 shadow-2xl backdrop-blur-md">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-4xl font-normal tracking-tight font-[family-name:var(--font-pacifico)]">
              Welcome back
            </CardTitle>
            <CardDescription>
              Enter your email or continue with your social account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 bg-background/50"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link
                    href="#"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 bg-background/50"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="h-10 w-full font-medium shadow-sm transition-all hover:shadow-md"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/80" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="rounded-full border border-border/80 bg-background/80 px-4 py-1 font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="flex h-10 w-full items-center gap-3 bg-background/50 font-medium shadow-sm transition-colors hover:bg-muted/50"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg
                  className="h-5 w-5"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="google"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
              )}
              Sign in with Google
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="#"
                className="font-semibold text-primary transition-colors hover:underline"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}