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
      .select("*, tank_livestock(quantity)")
      .order("created_at", { ascending: false });

    if (tErr) console.error("Tanks fetch error:", tErr);
    console.log("Tank List with Counts:", tanksData);

    if (tanksData) {
      const typedTanks = tanksData as unknown as Tank[];
      setTanks(prev => {
        if (JSON.stringify(prev) === JSON.stringify(typedTanks)) return prev;
        return typedTanks;
      });
      
      const counts: Record<string, number> = {};
      for (const tank of tanksData) {
        const total = (tank.tank_livestock as any[])?.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0) || 0;
        counts[tank.id] = total;
      }
      
      setLivestockCounts(prev => {
        if (JSON.stringify(prev) === JSON.stringify(counts)) return prev;
        return counts;
      });
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tanks.map((tank) => (
            <Card
              key={tank.id}
              className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all duration-200 group"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Link href={`/dashboard/tanks/${tank.id}`}>
                    <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors cursor-pointer">
                      {tank.name}
                    </CardTitle>
                  </Link>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => openEditDialog(tank)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
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
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs gap-1">
                    {tankTypeIcon(tank.tank_type)}
                    {tank.tank_type}
                  </Badge>
                  {tank.volume_gallons && (
                    <Badge variant="outline" className="text-xs">
                      {tank.volume_gallons}gal / {tank.volume_liters}L
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Fish className="w-3.5 h-3.5" />
                  {livestockCounts[tank.id] || 0} livestock
                </div>
                {tank.notes && (
                  <p className="text-xs text-muted-foreground/70 line-clamp-2">
                    {tank.notes}
                  </p>
                )}
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 text-primary hover:text-primary/80"
                >
                  <Link href={`/dashboard/tanks/${tank.id}`}>
                    View Details →
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
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
