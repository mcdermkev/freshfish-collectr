"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Fish, Mail, Lock, Waves, Globe, User } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: displayName,
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md glass-card border-border/50 shadow-2xl">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-aqua-500 to-reef flex items-center justify-center shadow-lg animate-wave">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl">Check your email!</CardTitle>
            <CardDescription>
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Animated background bubbles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/10 animate-bubble"
            style={{
              width: `${Math.random() * 20 + 8}px`,
              height: `${Math.random() * 20 + 8}px`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 8 + 6}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-ocean-50/50 via-transparent to-aqua-50/50 dark:from-ocean-950/80 dark:via-transparent dark:to-ocean-900/50" />

      <Card className="w-full max-w-md relative z-10 glass-card border-border/50 shadow-2xl shadow-primary/5">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-500 to-reef flex items-center justify-center shadow-lg shadow-ocean-500/25 animate-wave">
            <Fish className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-ocean-600 to-reef bg-clip-text text-transparent">
            Join AquaCollectr
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Start tracking your aquarium collection today
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full h-11 gap-2 font-medium hover:bg-accent transition-all"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <Globe className="w-4 h-4" />
            Continue with Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              or create an account
            </span>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="signup-name" className="text-sm">Display Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="FishKeeper42"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  minLength={6}
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-ocean-600 to-reef hover:from-ocean-700 hover:to-reef/90 text-white font-medium shadow-lg shadow-ocean-600/20 transition-all"
              disabled={loading}
            >
              {loading ? (
                <Waves className="w-4 h-4 animate-spin" />
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
