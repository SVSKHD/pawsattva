import Link from "next/link";
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

export default function LoginPage() {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      {/* Pet Background Image */}
      <div
        className="fixed inset-0 w-full h-[100dvh] z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=2500&auto=format&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-8 md:px-8">
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
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  className="h-10 bg-background/50"
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
                  className="h-10 bg-background/50"
                />
              </div>

              <Button
                type="submit"
                className="h-10 w-full font-medium shadow-sm transition-all hover:shadow-md"
              >
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
            >
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