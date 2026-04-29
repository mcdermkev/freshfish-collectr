import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Database as DbIcon, Info, RefreshCw, Plus, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import AdminFormClient from "./AdminFormClient";
import FeedbackManager from "./FeedbackManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  // Force fetch profile without caching
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  console.log("Admin Check for", user.id, "is_admin:", (profile as any)?.is_admin);

  if (pErr || !(profile as any)?.is_admin) {
    console.error("[ADMIN ACCESS DENIED] User ID:", user.id, "Profile Error:", pErr);
    console.error("[ADMIN ACCESS DENIED] Profile Data Returned:", profile);
    return (
      <div className="p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">This area is reserved for administrators only.</p>
        <Button asChild variant="outline">
          <a href="/dashboard">Return to Dashboard</a>
        </Button>
      </div>
    );
  }

  // Fetch feedback
  const { data: feedback } = await supabase
    .from("beta_feedback")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage the AquaCollectr global database</p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
          Admin Access Active
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Local Seeder Info */}
        <Card className="md:col-span-2 border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DbIcon className="w-5 h-5 text-primary" />
              Local Data Mastery
            </CardTitle>
            <CardDescription>
              AquaCollectr now uses local data snapshots for species management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 rounded-xl bg-muted/50 border border-border/50 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Bulk Import via Seeder Script</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  To perform bulk updates, use the <code>src/lib/seed-species.ts</code> utility. 
                  This script bypasses RLS and allows for rapid population of the species database using static JSON snapshots.
                </p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Badge variant="outline" className="px-4 py-2 border-primary/30 text-primary">
                Live API Search Disabled
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Info */}
        <div className="space-y-6">
          <Card className="bg-ocean-500/5 border-ocean-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="w-4 h-4 text-ocean-500" />
                Local Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-muted-foreground leading-relaxed">
              <p>• External FishBase API dependencies have been removed.</p>
              <p>• All search operations now target the local <code>public.species</code> table.</p>
              <p>• Data enrichment is performed via static seeding scripts.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <FeedbackManager initialFeedback={feedback || []} />

      <AdminFormClient />
    </div>
  );
}
