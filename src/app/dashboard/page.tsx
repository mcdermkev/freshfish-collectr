import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Container,
  Fish,
  Droplets,
  Plus,
  ArrowRight,
  Waves,
  Leaf,
  Bug,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import type { Tank } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const tankTypeIcon = (type: string) => {
  switch (type) {
    case "planted":
      return <Leaf className="w-4 h-4 text-aqua-500" />;
    case "freshwater":
      return <Fish className="w-4 h-4 text-ocean-500" />;
    default:
      return <Waves className="w-4 h-4 text-ocean-400" />;
  }
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log("Dashboard active for user:", user?.id);

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p>Please log in to view your dashboard.</p>
        <Button asChild className="mt-4">
          <Link href="/auth/login">Login</Link>
        </Button>
      </div>
    );
  }

  // Get species count (Global)
  const { count: speciesCount, error: sErr } = await (supabase.from("species") as any)
    .select("*", { count: "exact", head: true });
  if (sErr) console.error("Species count error:", sErr);

  // Get tanks for this user
  const { data: tanks, error: tErr } = await (supabase.from("tanks") as any)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  
  if (tErr) console.error("Tanks fetch error:", tErr);
  console.log("Tanks Data:", tanks?.length || 0, "found");

  // Get livestock counts per tank (sum of quantities)
  const livestockCounts: Record<string, number> = {};
  if (tanks) {
    for (const tank of tanks) {
      const { data: livestock, error: lErr } = await (supabase.from("tank_livestock") as any)
        .select("quantity")
        .eq("tank_id", tank.id);
        
      if (lErr) console.error(`Livestock fetch error for tank ${tank.id}:`, lErr);
      const total = livestock?.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0) || 0;
      livestockCounts[tank.id] = total;
    }
  }

  // Global livestock for this user including species info
  const { data: allLivestock, error: glErr } = await (supabase.from("tank_livestock") as any)
    .select("*, species(*)")
    .eq("user_id", user.id);
  
  if (glErr) console.error("Global livestock fetch error:", glErr);
  console.log(`[DASHBOARD] Fetched ${allLivestock?.length || 0} total livestock entries for user ${user.id}`);
  allLivestock?.forEach((l: any) => {
    console.log(`[DASHBOARD] Livestock: ${l.nickname || l.species?.common_name} (ID: ${l.id}) -> Tank ID: ${l.tank_id}`);
  });
  
  const totalLivestock = allLivestock?.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0) || 0;
  
  // Calculate collection value (only for 'alive' status)
  const collectionValue = allLivestock?.filter((l: any) => l.status === 'alive').reduce((sum: number, l: any) => {
    return sum + ((l.purchase_price || 0) * (l.quantity || 1));
  }, 0) || 0;
  
  // Identify unassigned livestock
  const tankIds = new Set(tanks?.map((t: any) => t.id) || []);
  const unassigned = allLivestock?.filter((l: any) => !l.tank_id || !tankIds.has(l.tank_id)) || [];
  const unassignedCount = unassigned.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0);

  const stats = [
    {
      label: "Total Tanks",
      value: tanks?.length || 0,
      icon: Container,
      color: "from-ocean-500 to-ocean-600",
    },
    {
      label: "Total Livestock",
      value: totalLivestock,
      icon: Fish,
      color: "from-aqua-500 to-reef",
    },
    {
      label: "Species DB",
      value: speciesCount || 0,
      icon: Bug,
      color: "from-coral to-warning",
    },
    {
      label: "Collection Value",
      value: `$${collectionValue.toFixed(2)}`,
      icon: DollarSign,
      color: "from-emerald-500 to-green-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back{" "}
          <span className="bg-gradient-to-r from-ocean-500 to-reef bg-clip-text text-transparent">
            🐠
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your aquarium collection.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Tanks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">My Tanks</h2>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
            <Link href="/dashboard/tanks">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {!tanks || tanks.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50 bg-card/50">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-500/20 to-reef/20 flex items-center justify-center">
                <Container className="w-8 h-8 text-ocean-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No tanks yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Create your first virtual aquarium to start tracking.
                </p>
              </div>
              <Button asChild className="bg-gradient-to-r from-ocean-600 to-reef text-white gap-2 shadow-lg shadow-ocean-600/20">
                <Link href="/dashboard/tanks">
                  <Plus className="w-4 h-4" /> Create Tank
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tanks.slice(0, 6).map((tank: any) => (
              <Link key={tank.id} href={`/dashboard/tanks/${tank.id}`}>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                        {tank.name}
                      </CardTitle>
                      {tankTypeIcon(tank.tank_type)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {tank.tank_type}
                      </Badge>
                      {tank.volume_gallons && (
                        <Badge variant="outline" className="text-xs">
                          {tank.volume_gallons}gal
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Fish className="w-3.5 h-3.5" />
                      {livestockCounts[tank.id] || 0} livestock
                    </div>
                    {tank.notes && (
                      <p className="text-xs text-muted-foreground/70 line-clamp-1">
                        {tank.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Unassigned Livestock */}
      {unassignedCount > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-xl font-semibold">Unassigned Inhabitants</h2>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              {unassignedCount} fish needing a home
            </Badge>
          </div>
          <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-amber-500/10">
                {unassigned.map((l: any) => (
                  <div key={l.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Fish className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {l.quantity}x {l.species?.common_name || "Unknown Species"}
                          {l.nickname && <span className="text-muted-foreground ml-2">({l.nickname})</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">Unassigned to any tank</p>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-8 border-amber-500/30 text-amber-700 hover:bg-amber-500/10">
                      <Link href="/dashboard/tanks">Assign to Tank</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              label: "Log Water Parameters",
              desc: "Record today's readings",
              icon: Droplets,
              href: "/dashboard/water-log",
              color: "from-ocean-500 to-ocean-600",
            },
            {
              label: "Browse Species",
              desc: "Find compatible fish",
              icon: Fish,
              href: "/dashboard/species",
              color: "from-aqua-500 to-reef",
            },
            {
              label: "Add New Tank",
              desc: "Set up a new aquarium",
              icon: Plus,
              href: "/dashboard/tanks",
              color: "from-coral to-warning",
            },
          ].map((action, i) => (
            <Link key={i} href={action.href}>
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
                <CardContent className="p-5 flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {action.label}
                    </h3>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
