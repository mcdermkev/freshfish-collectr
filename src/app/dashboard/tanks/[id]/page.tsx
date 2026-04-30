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
import { Fish, Plus, Trash2, AlertTriangle, Leaf, Bug, ArrowLeft, Shield, Thermometer, Camera, Image as ImageIcon, X, RefreshCw, Activity, Droplets, Ruler, Heart, Clock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Tank, Species, TankLivestockWithSpecies, WaterParameter } from "@/lib/types/database";
import { motion, AnimatePresence } from "framer-motion";
import { LivestockCard } from "@/components/dashboard/livestock-card";

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
  const [waterLogs, setWaterLogs] = useState<WaterParameter[]>([]);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickLogForm, setQuickLogForm] = useState({
    ph: "",
    temp: "",
    nitrate: ""
  });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [t, l, s, p] = await Promise.all([
      (supabase.from("tanks") as any).select("*").eq("id", tankId).eq("user_id", user.id).single(),
      (supabase.from("tank_livestock") as any).select("*, species(*)").eq("tank_id", tankId).order("created_at", { ascending: false }),
      (supabase.from("species") as any).select("*").order("common_name"),
      (supabase.from("water_parameters") as any).select("*").eq("tank_id", tankId).order("logged_at", { ascending: true }).limit(30)
    ]);
    
    if (t.error) console.error("[TANK DETAIL] Tank fetch error:", JSON.stringify(t.error, null, 2));
    if (l.error) console.error("[TANK DETAIL] Livestock fetch error:", JSON.stringify(l.error, null, 2));
    if (s.error) console.error("[TANK DETAIL] Species fetch error:", JSON.stringify(s.error, null, 2));
    if (p.error) console.error("[TANK DETAIL] Params fetch error:", JSON.stringify(p.error, null, 2));

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
    if (p.data) {
      setWaterLogs(p.data);
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

  const handleQuickLog = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await (supabase.from("water_parameters") as any).insert({
      tank_id: tankId,
      user_id: user.id,
      logged_at: new Date().toISOString(),
      ph: quickLogForm.ph ? parseFloat(quickLogForm.ph) : null,
      temperature_c: quickLogForm.temp ? parseFloat(quickLogForm.temp) : null,
      nitrate_ppm: quickLogForm.nitrate ? parseFloat(quickLogForm.nitrate) : null
    });

    if (error) {
      toast.error("Failed to log parameters: " + error.message);
    } else {
      toast.success("Health data recorded!");
      setShowQuickLog(false);
      setQuickLogForm({ ph: "", temp: "", nitrate: "" });
      load();
    }
    setSaving(false);
  };

  const filteredSp = allSpecies.filter(s => !speciesSearch || s.common_name.toLowerCase().includes(speciesSearch.toLowerCase()) || s.scientific_name?.toLowerCase().includes(speciesSearch.toLowerCase()));
  const aliveLivestock = livestock.filter(l => l.status === "alive");
  const aliveCount = aliveLivestock.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40" /></div>;
  if (!tank) return <div className="text-center py-12"><h2 className="text-xl font-semibold">Tank not found</h2><Link href="/dashboard/tanks"><Button variant="ghost" className="mt-4 gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button></Link></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10">
            <Link href="/dashboard/tanks">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">{tank.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-widest bg-ocean-500/20 text-ocean-300 border-ocean-500/30">{tank.tank_type}</Badge>
              {tank.volume_gallons && <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-white/10">{tank.volume_gallons} GAL</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 liquid-glass border-border/40 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-ocean-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-ocean-400" />
              Parameter History (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 relative pt-4">
            {waterLogs.length > 1 ? (
              <div className="w-full h-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
                  {/* pH Line (Blue) */}
                  <motion.path
                    d={(() => {
                      const width = 800;
                      const height = 200;
                      const phs = waterLogs.map(l => l.ph || 7);
                      const minPh = Math.min(...phs) - 0.5;
                      const maxPh = Math.max(...phs) + 0.5;
                      return waterLogs.map((l, i) => {
                        const x = (i / (waterLogs.length - 1)) * width;
                        const y = height - (((l.ph || 7) - minPh) / (maxPh - minPh)) * height;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ');
                    })()}
                    fill="none"
                    stroke="#0EA5E9"
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.5, ease: [0.4, 0, 0.2, 1] }}
                  />
                  {/* Temp Line (Coral) */}
                  <motion.path
                    d={(() => {
                      const width = 800;
                      const height = 200;
                      const temps = waterLogs.map(l => l.temperature_c || 25);
                      const minT = Math.min(...temps) - 2;
                      const maxT = Math.max(...temps) + 2;
                      return waterLogs.map((l, i) => {
                        const x = (i / (waterLogs.length - 1)) * width;
                        const y = height - (((l.temperature_c || 25) - minT) / (maxT - minT)) * height;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ');
                    })()}
                    fill="none"
                    stroke="#FF6B6B"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="8 4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.5, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
                  />
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground/60 pt-4 border-t border-white/5 font-mono">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-1 rounded-full bg-ocean-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
                      <span>pH Level</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-1 rounded-full bg-coral shadow-[0_0_8px_rgba(255,107,107,0.5)]" />
                      <span>Temp (°C)</span>
                    </div>
                  </div>
                  <span>{new Date(waterLogs[0].logged_at).toLocaleDateString()} &rarr; Today</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/40">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Clock className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-xs italic tracking-wide">Insufficient data for ecosystem trends.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="liquid-glass border-border/40 bg-ocean-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <Activity className="w-12 h-12 text-ocean-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-ocean-400">Current Ecosystem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-ocean-500/10 flex items-center justify-center text-ocean-400 border border-ocean-500/20 shadow-inner">
                    <Fish className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Inhabitants</p>
                    <p className="text-2xl font-black text-white">{aliveCount}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-aqua-500/10 flex items-center justify-center text-aqua-400 border border-aqua-500/20 shadow-inner">
                    <Droplets className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Last Health Check</p>
                    <p className="text-sm font-bold text-white/80">
                      {waterLogs.length > 0 ? new Date(waterLogs[waterLogs.length-1].logged_at).toLocaleDateString() : "Pending"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Button 
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-ocean-600 to-reef text-white font-bold shadow-xl shadow-ocean-600/20 hover:shadow-ocean-600/40 hover:-translate-y-1 transition-all"
            onClick={() => setShowQuickLog(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Water Log
          </Button>
        </div>
      </div>

      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
            <div className="w-2 h-8 rounded-full bg-ocean-500" />
            Ecosystem Inhabitants
          </h2>
          <Badge variant="outline" className="bg-white/5 border-white/10 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            {aliveLivestock.length} Groups
          </Badge>
        </div>

        {aliveLivestock.length === 0 ? (
          <Card className="border-dashed border-2 border-white/5 bg-white/[0.02] rounded-3xl">
            <CardContent className="p-20 text-center space-y-6">
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-ocean-500/10 to-reef/10 flex items-center justify-center border border-white/10"
              >
                <Fish className="w-10 h-10 text-ocean-500/40" />
              </motion.div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white/80">Your tank is empty</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">Start building your aquatic world by adding your first species.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {aliveLivestock.map(item => (
              <LivestockCard 
                key={item.id} 
                item={item} 
                onUpdateStatus={setStatusSel}
                onRemove={handleRemove}
                uploading={uploading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Log FAB */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-10 right-10 z-50"
      >
        <Button 
          className="w-16 h-16 rounded-3xl shadow-[0_20px_50px_rgba(14,165,233,0.3)] bg-gradient-to-br from-ocean-500 via-ocean-600 to-reef text-white p-0 border border-white/20 backdrop-blur-xl"
          onClick={() => setShowQuickLog(true)}
        >
          <Activity className="w-8 h-8" />
        </Button>
      </motion.div>

      {/* Quick Log Dialog */}
      <Dialog open={showQuickLog} onOpenChange={setShowQuickLog}>
        <DialogContent className="sm:max-w-xs liquid-glass border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-black">
              <div className="w-10 h-10 rounded-xl bg-ocean-500/10 flex items-center justify-center text-ocean-400">
                <Droplets className="w-6 h-6" />
              </div>
              Water Log
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Record Health Metrics</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">pH Level</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  placeholder="7.0" 
                  className="bg-white/5 border-white/10 h-12 text-lg font-bold"
                  value={quickLogForm.ph} 
                  onChange={e => setQuickLogForm({...quickLogForm, ph: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">Temp (°C)</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  placeholder="25.5" 
                  className="bg-white/5 border-white/10 h-12 text-lg font-bold"
                  value={quickLogForm.temp} 
                  onChange={e => setQuickLogForm({...quickLogForm, temp: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">Nitrates (ppm)</Label>
              <Input 
                type="number" 
                placeholder="20" 
                className="bg-white/5 border-white/10 h-12 text-lg font-bold"
                value={quickLogForm.nitrate} 
                onChange={e => setQuickLogForm({...quickLogForm, nitrate: e.target.value})}
              />
            </div>
            <Button 
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-ocean-600 to-reef text-white font-bold text-lg shadow-xl shadow-ocean-600/20" 
              onClick={handleQuickLog} 
              disabled={saving}
            >
              {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Sync Data"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={!!statusSel} onOpenChange={o => !o && setStatusSel(null)}>
        <DialogContent className="sm:max-w-md liquid-glass border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Update Ecosystem Status</DialogTitle>
            <DialogDescription className="text-ocean-400 font-bold">{statusSel?.nickname || statusSel?.species.common_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest">New Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v || "alive")}>
                <SelectTrigger className="h-12 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alive">Alive & Healthy</SelectItem>
                  <SelectItem value="deceased">Deceased</SelectItem>
                  <SelectItem value="rehomed">Rehomed</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
              <p className="text-xs text-amber-200/60 italic leading-relaxed">
                Updating status to anything other than &quot;Alive&quot; will archive this entry.
              </p>
            </div>
            <Button onClick={handleUpdateStatus} disabled={saving} className="w-full h-12 rounded-xl bg-gradient-to-r from-ocean-600 to-reef text-white font-bold">
              {saving ? "Processing..." : "Confirm Status Change"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
