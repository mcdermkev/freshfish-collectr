"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Droplets, Plus, Thermometer, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea } from "recharts";
import { Switch } from "@/components/ui/switch";
import type { Tank, WaterParameter, TankLivestockWithSpecies } from "@/lib/types/database";

export default function WaterLogPage() {
  const supabase = createClient();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState("");
  const [params, setParams] = useState<WaterParameter[]>([]);
  const [livestock, setLivestock] = useState<TankLivestockWithSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(true);

  // Form
  const [tempC, setTempC] = useState("");
  const [ph, setPh] = useState("");
  const [ammonia, setAmmonia] = useState("");
  const [nitrite, setNitrite] = useState("");
  const [nitrate, setNitrate] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (supabase.from("tanks") as any).select("*").order("name").then(({ data }: { data: any[] | null }) => {
      if (data && data.length > 0) { setTanks(data as Tank[]); setSelectedTankId(data[0].id); }
      setLoading(false);
    });
  }, [supabase]);

  const loadParams = useCallback(async () => {
    if (!selectedTankId) return;
    const [pRes, lRes] = await Promise.all([
      (supabase.from("water_parameters") as any)
        .select("*")
        .eq("tank_id", selectedTankId)
        .order("logged_at", { ascending: true }),
      (supabase.from("tank_livestock") as any)
        .select("*, species(*)")
        .eq("tank_id", selectedTankId)
        .eq("status", "alive")
    ]);
    
    if (pRes.data) setParams(pRes.data);
    if (lRes.data) setLivestock(lRes.data as unknown as TankLivestockWithSpecies[]);
  }, [supabase, selectedTankId]);

  useEffect(() => { loadParams(); }, [loadParams]);

  const handleLog = async () => {
    if (!selectedTankId) { toast.error("Select a tank"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); setSaving(false); return; }
    const { error } = await (supabase.from("water_parameters") as any).insert({
      tank_id: selectedTankId, user_id: user.id,
      logged_at: new Date(logDate).toISOString(),
      temperature_c: tempC ? parseFloat(tempC) : null,
      ph: ph ? parseFloat(ph) : null,
      ammonia_ppm: ammonia ? parseFloat(ammonia) : null,
      nitrite_ppm: nitrite ? parseFloat(nitrite) : null,
      nitrate_ppm: nitrate ? parseFloat(nitrate) : null,
      notes: notes.trim() || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Water params logged! 💧");
      setDialogOpen(false);
      setTempC(""); setPh(""); setAmmonia(""); setNitrite(""); setNitrate(""); setNotes("");
      setLogDate(new Date().toISOString().slice(0, 16));
      loadParams();
    }
    setSaving(false);
  };

  const chartData = params.map(p => ({
    date: new Date(p.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    "Temp (°C)": p.temperature_c,
    pH: p.ph,
    "NH₃": p.ammonia_ppm,
    "NO₂": p.nitrite_ppm,
    "NO₃": p.nitrate_ppm,
  }));

  const safeZones = useMemo(() => {
    if (livestock.length === 0) return null;
    
    const species = livestock.map(l => l.species);
    
    // Calculate overlap
    let tempMin = -Infinity;
    let tempMax = Infinity;
    let phMin = -Infinity;
    let phMax = Infinity;

    species.forEach(s => {
      if (s.temp_min_c !== null) tempMin = Math.max(tempMin, s.temp_min_c);
      if (s.temp_max_c !== null) tempMax = Math.min(tempMax, s.temp_max_c);
      if (s.ph_min !== null) phMin = Math.max(phMin, s.ph_min);
      if (s.ph_max !== null) phMax = Math.min(phMax, s.ph_max);
    });

    return {
      temp: { min: tempMin === -Infinity ? null : tempMin, max: tempMax === Infinity ? null : tempMax },
      ph: { min: phMin === -Infinity ? null : phMin, max: phMax === Infinity ? null : phMax }
    };
  }, [livestock]);

  // Compatibility Warning
  useEffect(() => {
    if (showSafeZones && safeZones) {
      const tempConflict = safeZones.temp.min !== null && safeZones.temp.max !== null && safeZones.temp.min > safeZones.temp.max;
      const phConflict = safeZones.ph.min !== null && safeZones.ph.max !== null && safeZones.ph.min > safeZones.ph.max;
      
      if (tempConflict || phConflict) {
        toast.error("Incompatible Species Parameters!", {
          description: `The species in this tank have non-overlapping ${tempConflict && phConflict ? "Temp and pH" : tempConflict ? "Temp" : "pH"} requirements.`,
          duration: 6000,
        });
      }
    }
  }, [showSafeZones, safeZones]);


  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Water Parameters</h1>
          <p className="text-muted-foreground text-sm mt-1">Track water quality over time</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-ocean-600 to-reef text-white gap-2 shadow-lg shadow-ocean-600/20" disabled={tanks.length === 0}>
              <Plus className="w-4 h-4" /> Log Reading
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Log Water Parameters</DialogTitle><DialogDescription>Record today&apos;s test results.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Tank</Label>
                <Select value={selectedTankId} onValueChange={(v) => setSelectedTankId(v || "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tanks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date / Time</Label>
                <Input type="datetime-local" value={logDate} onChange={e => setLogDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Temp (°C)</Label><Input type="number" step="0.1" placeholder="26.0" value={tempC} onChange={e => setTempC(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">pH</Label><Input type="number" step="0.1" placeholder="7.0" value={ph} onChange={e => setPh(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Ammonia (ppm)</Label><Input type="number" step="0.01" placeholder="0.00" value={ammonia} onChange={e => setAmmonia(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Nitrite (ppm)</Label><Input type="number" step="0.01" placeholder="0.00" value={nitrite} onChange={e => setNitrite(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Nitrate (ppm)</Label><Input type="number" step="1" placeholder="20" value={nitrate} onChange={e => setNitrate(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Water change, dosing, etc." value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleLog} disabled={saving} className="bg-gradient-to-r from-ocean-600 to-reef text-white">{saving ? "Saving..." : "Log"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tank selector & Toggle */}
      {tanks.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
          <div className="flex items-center gap-3">
            <Droplets className="w-5 h-5 text-ocean-500" />
            <Select value={selectedTankId} onValueChange={(v) => setSelectedTankId(v || "")}>
              <SelectTrigger className="w-[200px] bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>{tanks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-lg border border-border/50">
            <ShieldCheck className={`w-4 h-4 ${showSafeZones ? "text-green-500" : "text-muted-foreground"}`} />
            <Label htmlFor="safe-zones" className="text-xs font-medium cursor-pointer">Show Safe Zones</Label>
            <Switch id="safe-zones" checked={showSafeZones} onCheckedChange={setShowSafeZones} />
          </div>
        </div>
      )}

      {tanks.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50 bg-card/50">
          <CardContent className="p-8 text-center space-y-4">
            <Droplets className="w-12 h-12 mx-auto text-ocean-500/50" />
            <h3 className="text-lg font-semibold">No tanks yet</h3>
            <p className="text-muted-foreground text-sm">Create a tank first to start logging water parameters.</p>
          </CardContent>
        </Card>
      ) : params.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50 bg-card/50">
          <CardContent className="p-8 text-center space-y-4">
            <Thermometer className="w-12 h-12 mx-auto text-ocean-500/50" />
            <h3 className="text-lg font-semibold">No readings yet</h3>
            <p className="text-muted-foreground text-sm">Log your first water test to see charts here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* pH & Temperature Chart */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader><CardTitle className="text-base">pH & Temperature</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend />
                  
                  {showSafeZones && safeZones && safeZones.ph.min !== null && safeZones.ph.max !== null && (
                    <ReferenceArea yAxisId="left" y1={safeZones.ph.min} y2={safeZones.ph.max} fill="#14b8a6" fillOpacity={0.1} stroke="none" />
                  )}
                  
                  {showSafeZones && safeZones && safeZones.temp.min !== null && safeZones.temp.max !== null && (
                    <ReferenceArea yAxisId="right" y1={safeZones.temp.min} y2={safeZones.temp.max} fill="#f97316" fillOpacity={0.1} stroke="none" />
                  )}

                  <Line yAxisId="left" type="monotone" dataKey="pH" stroke="#14b8a6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="Temp (°C)" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Nitrogen Cycle Chart */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader><CardTitle className="text-base">Nitrogen Cycle (ppm)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend />
                  <Line type="monotone" dataKey="NH₃" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Ammonia" />
                  <Line type="monotone" dataKey="NO₂" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Nitrite" />
                  <Line type="monotone" dataKey="NO₃" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Nitrate" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent readings table */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader><CardTitle className="text-base">Recent Readings</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Temp</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">pH</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">NH₃</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">NO₂</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">NO₃</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...params].reverse().slice(0, 10).map(p => (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-accent/30">
                        <td className="py-2 px-3">{new Date(p.logged_at).toLocaleDateString()}</td>
                        <td className="text-right py-2 px-3">{p.temperature_c ?? "—"}°C</td>
                        <td className="text-right py-2 px-3">{p.ph ?? "—"}</td>
                        <td className={`text-right py-2 px-3 ${p.ammonia_ppm && p.ammonia_ppm > 0 ? "text-red-500 font-medium" : ""}`}>{p.ammonia_ppm ?? "—"}</td>
                        <td className={`text-right py-2 px-3 ${p.nitrite_ppm && p.nitrite_ppm > 0 ? "text-yellow-500 font-medium" : ""}`}>{p.nitrite_ppm ?? "—"}</td>
                        <td className="text-right py-2 px-3">{p.nitrate_ppm ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
