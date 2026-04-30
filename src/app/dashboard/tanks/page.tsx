"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Container,
  Fish,
  Plus,
  Pencil,
  Trash2,
  Leaf,
  Waves,
  Droplets,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Tank } from "@/lib/types/database";

export default function TanksPage() {
  const supabase = useMemo(() => createClient(), []);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTank, setDeletingTank] = useState<Tank | null>(null);
  const [livestockCounts, setLivestockCounts] = useState<Record<string, number>>({});

  // Form state
  const [name, setName] = useState("");
  const [volumeGallons, setVolumeGallons] = useState("");
  const [tankType, setTankType] = useState("freshwater");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTanks = useCallback(async () => {
    setLoading(true);
    const { data: tanksData, error: tErr } = await (supabase.from("tanks") as any)
      .select("*, tank_livestock(quantity), water_parameters(*)")
      .order("created_at", { ascending: false });

    if (tErr) console.error("Tanks fetch error:", tErr);

    if (tanksData) {
      // Sort water parameters manually for each tank to get the latest 3
      const tanksWithLogs = (tanksData as any[]).map(tank => {
        const sortedLogs = (tank.water_parameters as any[])?.sort((a, b) => 
          new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
        ).slice(0, 3) || [];
        
        return {
          ...tank,
          logs: sortedLogs
        };
      });

      setTanks(tanksWithLogs as unknown as Tank[]);
      
      const counts: Record<string, number> = {};
      for (const tank of tanksData) {
        const total = (tank.tank_livestock as any[])?.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0) || 0;
        counts[tank.id] = total;
      }
      
      setLivestockCounts(counts);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadTanks();
  }, [loadTanks]);

  const resetForm = () => {
    setName("");
    setVolumeGallons("");
    setTankType("freshwater");
    setNotes("");
    setEditingTank(null);
  };

  const openEditDialog = (tank: Tank) => {
    setEditingTank(tank);
    setName(tank.name);
    setVolumeGallons(tank.volume_gallons?.toString() || "");
    setTankType(tank.tank_type);
    setNotes(tank.notes || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Tank name is required");
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Not authenticated");
      setSaving(false);
      return;
    }

    const gallons = volumeGallons ? parseFloat(volumeGallons) : null;
    const liters = gallons ? Math.round(gallons * 3.78541 * 10) / 10 : null;

    if (editingTank) {
      const { error } = await (supabase.from("tanks") as any)
        .update({
          name: name.trim(),
          volume_gallons: gallons,
          volume_liters: liters,
          tank_type: tankType,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTank.id);

      if (error) {
        toast.error("Failed to update tank: " + error.message);
      } else {
        toast.success("Tank updated!");
      }
    } else {
      const { error } = await (supabase.from("tanks") as any).insert({
        user_id: user.id,
        name: name.trim(),
        volume_gallons: gallons,
        volume_liters: liters,
        tank_type: tankType,
        notes: notes.trim() || null,
      });

      if (error) {
        toast.error("Failed to create tank: " + error.message);
      } else {
        toast.success("Tank created! 🐠");
      }
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    loadTanks();
  };

  const handleDelete = async () => {
    if (!deletingTank) return;

    const { error } = await (supabase.from("tanks") as any)
      .delete()
      .eq("id", deletingTank.id);

    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("Tank deleted");
    }

    setDeleteDialogOpen(false);
    setDeletingTank(null);
    loadTanks();
  };

  const tankTypeIcon = (type: string) => {
    switch (type) {
      case "planted":
        return <Leaf className="w-4 h-4 text-aqua-500" />;
      case "freshwater":
        return <Fish className="w-4 h-4 text-ocean-500" />;
      case "brackish":
        return <Waves className="w-4 h-4 text-ocean-400" />;
      default:
        return <Droplets className="w-4 h-4 text-ocean-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Tanks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your virtual aquariums
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-ocean-600 to-reef text-white gap-2 shadow-lg shadow-ocean-600/20">
              <Plus className="w-4 h-4" /> New Tank
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTank ? "Edit Tank" : "Create New Tank"}
              </DialogTitle>
              <DialogDescription>
                {editingTank
                  ? "Update your aquarium details."
                  : "Set up a new virtual aquarium to start tracking."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="tank-name">Tank Name *</Label>
                <Input
                  id="tank-name"
                  placeholder="Living Room 40 Breeder"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tank-volume">Volume (Gallons)</Label>
                  <Input
                    id="tank-volume"
                    type="number"
                    placeholder="40"
                    value={volumeGallons}
                    onChange={(e) => setVolumeGallons(e.target.value)}
                  />
                  {volumeGallons && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {Math.round(parseFloat(volumeGallons) * 3.78541 * 10) / 10}L
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tank-type">Type</Label>
                  <Select value={tankType} onValueChange={(v) => setTankType(v || "freshwater")}>
                    <SelectTrigger id="tank-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freshwater">Freshwater</SelectItem>
                      <SelectItem value="planted">Planted</SelectItem>
                      <SelectItem value="brackish">Brackish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tank-notes">Notes</Label>
                <Textarea
                  id="tank-notes"
                  placeholder="Substrate, filter, heater, lights..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-ocean-600 to-reef text-white"
              >
                {saving ? "Saving..." : editingTank ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tank Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tanks.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50 bg-card/50">
          <CardContent className="p-12 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-ocean-500/20 to-reef/20 flex items-center justify-center">
              <Container className="w-10 h-10 text-ocean-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">No tanks yet</h3>
              <p className="text-muted-foreground mt-1">
                Create your first virtual aquarium to start tracking fish, plants, and water parameters.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tanks.map((tank: any) => {
            const lastLogDate = tank.logs?.[0] ? new Date(tank.logs[0].logged_at) : null;
            const needsUpdate = lastLogDate ? (Date.now() - lastLogDate.getTime() > 7 * 24 * 60 * 60 * 1000) : true;

            return (
              <Card
                key={tank.id}
                className="relative overflow-hidden border-border/40 bg-background/40 backdrop-blur-xl hover:shadow-2xl hover:shadow-ocean-500/10 transition-all duration-500 group border-[0.5px]"
              >
                {/* Immersive Hero Background */}
                <div className="absolute inset-0 -z-10 overflow-hidden">
                  {tank.cover_image_url ? (
                    <>
                      <img 
                        src={tank.cover_image_url} 
                        className="w-full h-full object-cover blur-2xl opacity-20 scale-110 group-hover:scale-125 transition-transform duration-1000"
                        alt=""
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/60 to-background" />
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-ocean-900/20 via-aqua-900/10 to-background animate-pulse opacity-30" />
                  )}
                </div>

                {/* Status Indicator Pulse */}
                {needsUpdate && (
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-coral"></span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-coral/80 bg-coral/5 px-2 py-0.5 rounded-full border border-coral/20 backdrop-blur-sm">
                      Update Needed
                    </span>
                  </div>
                )}

                <CardHeader className="relative pb-2 pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Link href={`/dashboard/tanks/${tank.id}`}>
                        <CardTitle className="text-xl font-bold group-hover:text-ocean-400 transition-colors cursor-pointer flex items-center gap-2">
                          {tank.name}
                        </CardTitle>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tighter bg-white/5 border-white/10 text-muted-foreground backdrop-blur-md">
                          {tank.tank_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-white/10 rounded-full"
                        onClick={() => openEditDialog(tank)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-500/10 rounded-full text-destructive"
                        onClick={() => {
                          setDeletingTank(tank);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-2">
                  {/* Glassmorphic Stats Row */}
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2 shadow-inner">
                      <Fish className="w-3.5 h-3.5 text-ocean-400" />
                      <span className="text-xs font-bold">{livestockCounts[tank.id] || 0}</span>
                    </div>
                    {tank.volume_gallons && (
                      <div className="px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2 shadow-inner">
                        <Container className="w-3.5 h-3.5 text-aqua-400" />
                        <span className="text-xs font-bold">{tank.volume_gallons}g</span>
                      </div>
                    )}
                  </div>

                  {/* Health Snapshot Section */}
                  <div className="space-y-3 p-3 rounded-2xl bg-black/20 border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Health Snapshot</p>
                      <Droplets className="w-3 h-3 text-ocean-500/50" />
                    </div>
                    
                    {tank.logs && tank.logs.length > 0 ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-muted-foreground uppercase font-bold">pH</span>
                          <span className="text-xs font-mono font-bold text-reef">{tank.logs[0].ph || "—"}</span>
                        </div>
                        <div className="h-6 w-[1px] bg-white/5" />
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-muted-foreground uppercase font-bold">Temp</span>
                          <span className="text-xs font-mono font-bold text-coral">{tank.logs[0].temperature_c || "—"}°C</span>
                        </div>
                        <div className="h-6 w-[1px] bg-white/5" />
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-muted-foreground uppercase font-bold">NO3</span>
                          <span className="text-xs font-mono font-bold text-aqua-400">{tank.logs[0].nitrate_ppm || "—"}</span>
                        </div>
                        <div className="h-6 w-[1px] bg-white/5" />
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] text-muted-foreground uppercase font-bold">Trend</span>
                          <div className="flex items-center gap-0.5">
                            {tank.logs.slice(0, 3).reverse().map((log: any, idx: number) => (
                              <div 
                                key={log.id} 
                                className="w-1.5 bg-ocean-500/40 rounded-full"
                                style={{ height: `${Math.min((log.ph || 7) * 2, 12)}px` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic text-center py-1">No health data logged yet</p>
                    )}
                  </div>

                  <Button
                    asChild
                    variant="ghost"
                    className="w-full h-10 rounded-xl bg-ocean-600/10 hover:bg-ocean-600/20 text-ocean-400 text-xs font-bold gap-2 group/btn"
                  >
                    <Link href={`/dashboard/tanks/${tank.id}`}>
                      Enter Control Center
                      <Waves className="w-3.5 h-3.5 group-hover/btn:animate-pulse" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Tank</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingTank?.name}&rdquo;? This will also
              remove all livestock and water logs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
