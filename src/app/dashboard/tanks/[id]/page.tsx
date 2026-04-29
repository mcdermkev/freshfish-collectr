"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fish, Plus, Trash2, AlertTriangle, Leaf, Bug, ArrowLeft, Shield, Thermometer, Camera, Image as ImageIcon, X, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Tank, Species, TankLivestockWithSpecies } from "@/lib/types/database";

function checkCompat(livestock: TankLivestockWithSpecies[], tank: Tank): string[] {
  const warns: string[] = [];
  const alive = livestock.filter(l => !l.status || l.status === "alive").map(l => l.species);
  const hasAgg = alive.some(s => s.aggression_level === "aggressive");
  const hasPeace = alive.some(s => s.aggression_level === "peaceful");
  if (hasAgg && hasPeace) {
    warns.push(`⚠️ Aggression conflict: ${alive.filter(s => s.aggression_level === "aggressive").map(s => s.common_name).join(", ")} may harm peaceful tankmates`);
  }
  if (tank.volume_gallons) {
    alive.filter(s => s.min_tank_gallons && s.min_tank_gallons > tank.volume_gallons!).forEach(s => {
      warns.push(`🐟 ${s.common_name} needs ${s.min_tank_gallons}gal min — your tank is ${tank.volume_gallons}gal`);
    });
  }
  const temps = alive.filter(s => s.temp_min_c && s.temp_max_c).map(s => ({ name: s.common_name, min: s.temp_min_c!, max: s.temp_max_c! }));
  if (temps.length > 1) {
    const oMin = Math.max(...temps.map(r => r.min));
    const oMax = Math.min(...temps.map(r => r.max));
    if (oMin > oMax) warns.push("🌡️ Temperature ranges don't overlap! Some species need incompatible temps.");
  }
  return warns;
}

const catIcon = (c: string) => {
  if (c === "fish") return <Fish className="w-4 h-4 text-ocean-500" />;
  if (c === "plant") return <Leaf className="w-4 h-4 text-aqua-500" />;
  return <Bug className="w-4 h-4 text-coral" />;
};

export default function TankDetailPage() {
  const { id: tankId } = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [tank, setTank] = useState<Tank | null>(null);
  const [livestock, setLivestock] = useState<TankLivestockWithSpecies[]>([]);
  const [allSpecies, setAllSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [speciesId, setSpeciesId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [nickname, setNickname] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [origin, setOrigin] = useState("purchased");
  const [lifeStage, setLifeStage] = useState("adult");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [statusSel, setStatusSel] = useState<TankLivestockWithSpecies | null>(null);
  const [newStatus, setNewStatus] = useState("alive");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [t, l, s] = await Promise.all([
      (supabase.from("tanks") as any).select("*").eq("id", tankId).eq("user_id", user.id).single(),
      (supabase.from("tank_livestock") as any).select("*, species(*)").eq("tank_id", tankId).order("created_at", { ascending: false }),
      (supabase.from("species") as any).select("*").order("common_name"),
    ]);
    
    if (t.error) console.error("[TANK DETAIL] Tank fetch error:", JSON.stringify(t.error, null, 2));
    if (l.error) console.error("[TANK DETAIL] Livestock fetch error:", JSON.stringify(l.error, null, 2));
    if (s.error) console.error("[TANK DETAIL] Species fetch error:", JSON.stringify(s.error, null, 2));

    console.log("[TANK DETAIL] Tank Data:", t.data);
    console.log("[TANK DETAIL] Livestock Data:", l.data);
    console.log(`[TANK DETAIL] Species Data Count: ${s.data?.length}`);
    
    if (l.data?.length === 0) {
      console.warn(`[TANK DETAIL] No livestock found for Tank ID: ${tankId} and User ID: ${user.id}`);
    }

    if (t.data) {
      setTank(prev => {
        if (JSON.stringify(prev) === JSON.stringify(t.data)) return prev;
        return t.data;
      });
    }
    if (l.data) {
      const typed = l.data as unknown as TankLivestockWithSpecies[];
      setLivestock(prev => {
        if (JSON.stringify(prev) === JSON.stringify(typed)) return prev;
        return typed;
      });
      if (t.data) setWarnings(checkCompat(typed, t.data));
    }
    if (s.data) {
      setAllSpecies(prev => {
        if (JSON.stringify(prev) === JSON.stringify(s.data)) return prev;
        return s.data;
      });
    }
    setLoading(false);
  }, [supabase, tankId]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setSpeciesId(""); setQuantity("1"); setNickname(""); setPurchaseDate(""); setPurchasePrice(""); setOrigin("purchased"); setLifeStage("adult"); setNotes(""); setSpeciesSearch(""); };

  const handleAdd = async () => {
    if (!speciesId) { toast.error("Select a species"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); setSaving(false); return; }
    const { error } = await (supabase.from("tank_livestock") as any).insert({
      tank_id: tankId, species_id: speciesId, user_id: user.id,
      quantity: parseInt(quantity) || 1, nickname: nickname.trim() || null,
      purchase_date: purchaseDate || null,
      purchase_price: (origin !== "bred" && purchasePrice) ? parseFloat(purchasePrice) : null,
      origin,
      life_stage: lifeStage,
      notes: notes.trim() || null,
    });
    if (error) toast.error(error.message); else { toast.success("Added! 🐠"); setDialogOpen(false); resetForm(); load(); }
    setSaving(false);
  };

  const handleUpdateStatus = async () => {
    if (!statusSel) return;
    setSaving(true);
    const { error } = await (supabase.from("tank_livestock") as any)
      .update({ status: newStatus })
      .eq("id", statusSel.id);

    if (error) toast.error(error.message);
    else {
      toast.success("Status updated!");
      setStatusSel(null);
      load();
    }
    setSaving(false);
  };

  const handleRemove = async (id: string, name: string) => {
    const { error } = await (supabase.from("tank_livestock") as any).update({ status: "rehomed", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`${name} rehomed`); load(); }
  };

  const handleUploadPhoto = async (livestockId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(livestockId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); setUploading(null); return; }

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${livestockId}/${Math.random()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('livestock-photos')
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('livestock-photos')
      .getPublicUrl(filePath);

    const { error: dbError } = await (supabase.from('livestock_photos') as any).insert({
      livestock_id: livestockId,
      user_id: user.id,
      storage_path: filePath,
      url: publicUrl,
    });

    if (dbError) {
      toast.error("Failed to save photo record: " + dbError.message);
    } else {
      toast.success("Photo uploaded! 📸");
      load();
    }
    setUploading(null);
  };

  const filteredSp = allSpecies.filter(s => !speciesSearch || s.common_name.toLowerCase().includes(speciesSearch.toLowerCase()) || s.scientific_name?.toLowerCase().includes(speciesSearch.toLowerCase()));
  const aliveLivestock = livestock.filter(l => l.status === "alive");
  const aliveCount = aliveLivestock.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40" /></div>;
  if (!tank) return <div className="text-center py-12"><h2 className="text-xl font-semibold">Tank not found</h2><Link href="/dashboard/tanks"><Button variant="ghost" className="mt-4 gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button></Link></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
            <Link href="/dashboard/tanks">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{tank.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs capitalize">{tank.tank_type}</Badge>
              {tank.volume_gallons && <Badge variant="outline" className="text-xs">{tank.volume_gallons}gal</Badge>}
              <span className="text-sm text-muted-foreground">• {aliveCount} alive</span>
            </div>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-ocean-600 to-reef text-white gap-2 shadow-lg shadow-ocean-600/20"><Plus className="w-4 h-4" /> Add Livestock</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add to {tank?.name}</DialogTitle><DialogDescription>Select a species and quantity.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Species *</Label>
                <Input placeholder="Search species..." value={speciesSearch} onChange={e => setSpeciesSearch(e.target.value)} className="mb-2" />
                <Select value={speciesId} onValueChange={(v) => setSpeciesId(v || "")}>
                  <SelectTrigger><SelectValue placeholder="Select species" /></SelectTrigger>
                  <SelectContent className="max-h-60">{filteredSp.map(s => <SelectItem key={s.id} value={s.id}><span className="flex items-center gap-2">{catIcon(s.category)}{s.common_name}</span></SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                <div className="space-y-2"><Label>Nickname</Label><Input placeholder="Bubbles" value={nickname} onChange={e => setNickname(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origin</Label>
                  <Select value={origin} onValueChange={(v) => setOrigin(v || "purchased")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchased">Purchased</SelectItem>
                      <SelectItem value="bred">Home Bred</SelectItem>
                      <SelectItem value="gifted">Gifted</SelectItem>
                      <SelectItem value="wild_caught">Wild Caught</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Life Stage</Label>
                  <Select value={lifeStage} onValueChange={(v) => setLifeStage(v || "adult")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="egg">Egg</SelectItem>
                      <SelectItem value="fry">Fry</SelectItem>
                      <SelectItem value="juvenile">Juvenile</SelectItem>
                      <SelectItem value="adult">Adult</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{origin === "bred" ? "Acquisition/Spawn Date" : "Purchase Date"}</Label>
                  <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                </div>
                {origin !== "bred" && (
                  <div className="space-y-2"><Label>Price ($)</Label><Input type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} /></div>
                )}
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleAdd} disabled={saving} className="bg-gradient-to-r from-ocean-600 to-reef text-white">{saving ? "Adding..." : "Add"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {warnings.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-warning"><AlertTriangle className="w-5 h-5" /> Compatibility Warnings</CardTitle></CardHeader>
          <CardContent><ul className="space-y-1.5">{warnings.map((w, i) => <li key={i} className="text-sm text-muted-foreground">{w}</li>)}</ul></CardContent>
        </Card>
      )}

      {aliveLivestock.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50 bg-card/50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-500/20 to-reef/20 flex items-center justify-center"><Fish className="w-8 h-8 text-ocean-500" /></div>
            <h3 className="text-lg font-semibold">No livestock yet</h3>
            <p className="text-muted-foreground text-sm">Add fish, plants, or inverts to this tank.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {aliveLivestock.map(item => (
            <Card key={item.id} className="border-border/50 bg-card/80 backdrop-blur-sm transition-all overflow-hidden">
              <CardContent className="p-0">
                {/* Livestock Header */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {catIcon(item?.species?.category || "fish")}
                      <div>
                        <h3 className="font-semibold text-xs truncate max-w-[120px]">{item?.nickname || item?.species?.common_name}</h3>
                        {item?.nickname && <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{item?.species?.common_name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => { setStatusSel(item); setNewStatus(item.status); }}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      {item.status === "alive" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => handleRemove(item.id, item.nickname || item.species.common_name)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px] py-0 px-1">x{item?.quantity}</Badge>
                    <Badge variant="outline" className={`text-[10px] py-0 px-1 capitalize ${item?.status === "alive" ? "border-green-500/30 text-green-600 dark:text-green-400" : ""}`}>{item?.status}</Badge>
                    {item?.life_stage && item?.life_stage !== "adult" && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 capitalize bg-amber-500/10 text-amber-600 border-amber-500/20">{item.life_stage}</Badge>
                    )}
                    {item?.origin === "bred" && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 capitalize bg-purple-500/10 text-purple-600 border-purple-500/20">Bred</Badge>
                    )}
                    {item?.species?.aggression_level && <Badge variant="outline" className="text-[10px] py-0 px-1 capitalize"><Shield className="w-2.5 h-2.5 mr-0.5" />{item.species.aggression_level}</Badge>}
                  </div>

                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    {item?.species?.temp_min_c && <div className="flex items-center gap-1"><Thermometer className="w-2.5 h-2.5" />{item.species.temp_min_c}–{item.species.temp_max_c}°C</div>}
                    {item?.purchase_date && <p>In: {new Date(item.purchase_date).toLocaleDateString()}{item?.purchase_price ? ` · $${item.purchase_price}` : ""}</p>}
                    {item?.notes && <p className="line-clamp-1 italic">{item.notes}</p>}
                  </div>

                  {/* Photo Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    <Label htmlFor={`photo-${item.id}`} className="cursor-pointer">
                      <div className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                        {uploading === item.id ? "Uploading..." : "Add Photo"}
                      </div>
                      <input 
                        id={`photo-${item.id}`} 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleUploadPhoto(item.id, e)}
                        disabled={uploading === item.id}
                      />
                    </Label>
                  </div>
                </div>

                {/* Species Image */}
                <div className="bg-muted/30 border-t border-border/50 h-32 flex items-center justify-center overflow-hidden">
                  {item?.species?.image_url ? (
                    <img 
                      src={item.species.image_url} 
                      alt={item?.species?.common_name || "Species"} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&q=80&w=400&q=fish";
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Status Update Dialog */}
      <Dialog open={!!statusSel} onOpenChange={o => !o && setStatusSel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Status: {statusSel?.nickname || statusSel?.species.common_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v || "alive")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alive">Alive</SelectItem>
                  <SelectItem value="deceased">Deceased</SelectItem>
                  <SelectItem value="rehomed">Rehomed</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground italic">
              * Note: Items marked as deceased, rehomed, or sold will be removed from your active tank view but kept in your history.
            </p>
            <Button onClick={handleUpdateStatus} disabled={saving} className="w-full bg-gradient-to-r from-ocean-600 to-reef text-white">
              {saving ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
