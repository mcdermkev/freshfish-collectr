"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Fish,
  LayoutDashboard,
  Droplets,
  BookOpen,
  Menu,
  LogOut,
  User,
  Container,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { FeedbackFAB } from "@/components/feedback-fab";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tanks", label: "My Tanks", icon: Container },
  { href: "/dashboard/species", label: "Species DB", icon: BookOpen },
  { href: "/dashboard/water-log", label: "Water Log", icon: Droplets },
  { href: "/dashboard/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          active
            ? "bg-primary/10 text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
        )}
      >
        <Icon className={cn("w-5 h-5", active && "text-primary")} />
        {label}
      </div>
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      if (user) {
        setUser(user);
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (mounted && (data as any)?.is_admin && !isAdmin) setIsAdmin(true);
          });
      }
    });
    return () => { mounted = false; };
  }, [supabase, isAdmin]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const initials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || user?.email?.[0]?.toUpperCase() || "A";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-card/50 backdrop-blur-sm p-4 fixed h-screen">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ocean-500 to-reef flex items-center justify-center shadow-md shadow-ocean-500/20">
            <Fish className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-ocean-500 to-reef bg-clip-text text-transparent">
            AquaCollectr
          </span>
        </Link>

        {/* Nav */}
        <nav className="space-y-1 flex-1">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href)
                }
              />
            ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border/50 pt-4 space-y-2">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 md:px-6 border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <div className="flex items-center gap-2.5 px-3 py-2 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ocean-500 to-reef flex items-center justify-center">
                    <Fish className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-ocean-500 to-reef bg-clip-text text-transparent">
                    AquaCollectr
                  </span>
                </div>
                <nav className="space-y-1">
                  {navItems
                    .filter((item) => !item.adminOnly || isAdmin)
                    .map((item) => (
                      <NavLink
                        key={item.href}
                        {...item}
                        active={
                          item.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname.startsWith(item.href)
                        }
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}
                </nav>
              </SheetContent>
            </Sheet>

            <h1 className="text-lg font-semibold hidden md:block">
              {navItems.find((item) =>
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
              )?.label || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-ocean-500 to-reef text-white text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium">
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Aquarist"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        <FeedbackFAB />
      </div>
    </div>
  );
}
