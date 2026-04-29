"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-coral/20 rounded-full animate-pulse" />
          <AlertTriangle className="w-12 h-12 text-coral relative z-10" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Oops! Something went wrong in the tank.</h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Don&apos;t worry, your fish are likely fine, but the app needs a moment.
          </p>
        </div>

        {error.digest && (
          <div className="p-3 bg-muted/50 rounded-lg font-mono text-[10px] text-muted-foreground">
            Error ID: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button 
            onClick={() => reset()}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-ocean-600 to-reef text-white shadow-lg shadow-ocean-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            Try to Recover
          </Button>
          
          <Button asChild variant="outline" className="w-full sm:w-auto gap-2">
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          If the problem persists, please try refreshing the page or clearing your cache.
        </p>
      </div>
    </div>
  );
}
