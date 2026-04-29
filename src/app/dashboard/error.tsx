"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in zoom-in duration-300">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-ocean-500/20 rounded-full animate-ping opacity-25" />
        <div className="relative p-4 bg-ocean-500/10 rounded-full border border-ocean-500/20">
          <AlertTriangle className="w-10 h-10 text-ocean-500" />
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-2">Something went wrong in the tank!</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        We hit a snag while loading your dashboard. Don&apos;t worry, your fish are safe, but we need to try that again.
      </p>

      {error.digest && (
        <div className="mb-8 p-3 bg-muted/50 rounded-lg font-mono text-[10px] text-muted-foreground border border-border/50">
          Trace ID: {error.digest}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={() => reset()}
          className="gap-2 bg-gradient-to-r from-ocean-600 to-reef text-white shadow-lg shadow-ocean-600/20 px-6"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard">
            <LayoutDashboard className="w-4 h-4" />
            Reload Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
