"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, Fish, Leaf, Bug, Thermometer, Ruler, Container, 
  Shield, Heart, RefreshCw, ExternalLink, Plus, Database as DbIcon,
  Sparkles, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useCallback, useRef } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import type { Species } from "@/lib/types/database";
import { searchGlobalFishBase, importSpecies } from "@/lib/actions/fishbase";
import { SpeciesCard } from "@/components/dashboard/species-card";
import { semanticSearchInterceptor } from "@/lib/actions/search";
import Fuse from "fuse.js";
import { motion, AnimatePresence } from "framer-motion";

const aggrColor = (l: string | null) => {
  if (l === "peaceful") return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20";
  if (l === "semi-aggressive") return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
  if (l === "aggressive") return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20";
  return "";
};

const diffColor = (l: string | null) => {
  if (l === "beginner" || l === "easy") return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20";
  if (l === "intermediate") return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20";
  if (l === "advanced") return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20";
  return "";
};

const catIcon = (c: string) => {
  if (c === "fish") return <Fish className="w-4 h-4 text-ocean-500" />;
  if (c === "plant") return <Leaf className="w-4 h-4 text-aqua-500" />;
  if (c === "invertebrate") return <Bug className="w-4 h-4 text-coral" />;
  return null;
};

export default function SpeciesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catF, setCatF] = useState("all");
  const [dietF, setDietF] = useState("all");
  const [swimF, setSwimF] = useState("all");
  const [sel, setSel] = useState<Species | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [hasSearchedGlobal, setHasSearchedGlobal] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  
  // Phase 1: Semantic Interceptor states
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);
  const [semanticSummary, setSemanticSummary] = useState<string | null>(null);
  const [semanticResults, setSemanticResults] = useState<Species[]>([]);

  const [newSpec, setNewSpec] = useState<Partial<Species>>({
    common_name: "",
    category: "fish",
    aggression_level: "peaceful",
    care_difficulty: "easy"
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && mounted) {
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

  const loadLocal = useCallback(async (searchTerm = "") => {
    setLoading(true);
    try {
      let query = (supabase.from("species") as any).select("*");
      
      if (searchTerm) {
        query = query.or(`common_name.ilike.%${searchTerm}%,scientific_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order("common_name");
      
      if (error) {
        console.error("Local species fetch error:", error);
        toast.error("Failed to load species database");
      }
      
      if (data) {
        // Only update if data actually changed to prevent render loops
        setSpecies(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLocal(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [loadLocal, search]);

  const handleAddSpecies = async () => {
    if (!newSpec.common_name) return;
    setIsSaving(true);
    try {
      const { error } = await (supabase.from("species") as any).insert([newSpec]);
      if (error) throw error;
      toast.success(`${newSpec.common_name} added to database!`);
      setShowAdd(false);
      loadLocal(search);
    } catch (error: any) {
      console.error("Add species error:", error);
      toast.error(error.message || "Failed to add species");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGlobalSearch = async () => {
    if (!search || search.length < 3) {
      toast.error("Please enter at least 3 characters");
      return;
    }
    setFbLoading(true);
    try {
      const results = await searchGlobalFishBase(search);
      setGlobalResults(results as any[]);
      setHasSearchedGlobal(true);
      if ((results as any[]).length === 0) {
        toast.info("Species not found in global index. Use Manual Entry.");
      }
    } catch (err) {
      console.error("Global search error:", err);
      toast.error("Failed to query global FishBase");
    } finally {
      setFbLoading(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);

  const handleSaveEdit = async () => {
    if (!sel) return;
    setIsSaving(true);
    try {
      const { error } = await (supabase.from("species") as any)
        .update({
          temp_min_c: sel.temp_min_c,
          temp_max_c: sel.temp_max_c,
          ph_min: sel.ph_min,
          ph_max: sel.ph_max,
          notes: sel.notes,
        })
        .eq("id", sel.id);

      if (error) throw error;
      toast.success("Species details updated!");
      setIsEditing(false);
      loadLocal(search);
    } catch (error: any) {
      toast.error(error.message || "Failed to update species");
    } finally {
      setIsSaving(false);
    }
  };

  const [importingIds, setImportingIds] = useState<Set<number>>(new Set());

  const handleImport = async (fish: any) => {
    if (importingIds.has(fish.spec_code)) return;

    setImportingIds(prev => new Set(prev).add(fish.spec_code));
    
    const promise = importSpecies(fish);
    
    toast.promise(promise, {
      loading: `Enriching Data & Generating HD Media for ${fish.scientific_name}...`,
      success: (result) => {
        return (
          <div className="flex flex-col gap-1">
            <span>Imported {fish.scientific_name}!</span>
            <span className="text-[10px] text-muted-foreground italic">Redirecting to detail view...</span>
          </div>
        );
      },
      error: "Import failed. Please try again.",
    });

    try {
      const result = await promise;
      if (result && result.id) {
        // Automatically redirect to the new Species Detail card
        setTimeout(() => {
          router.push(`/dashboard/species/${result.id}`);
        }, 1500);
      }
      loadLocal(search);
      setGlobalResults(prev => prev.filter(item => item.spec_code !== fish.spec_code));
    } catch (err) {
      console.error(err);
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev);
        next.delete(fish.spec_code);
        return next;
      });
    }
  };


  // Phase 1: Fuzzy Search with fuse.js
  const filtered = useMemo(() => {
    let base = species.filter((s) => {
      return (catF === "all" || s.category === catF)
        && (dietF === "all" || (s.diet && s.diet.toLowerCase().includes(dietF.toLowerCase())))
        && (swimF === "all" || (s.swim_zone && s.swim_zone.toLowerCase().includes(swimF.toLowerCase())));
    });

    if (!search) return base;

    const fuse = new Fuse(base, {
      keys: [
        { name: 'common_name', weight: 0.7 },
        { name: 'scientific_name', weight: 0.9 }, // Prioritize scientific names as requested
      ],
      threshold: 0.3,
      includeScore: true
    });

    return fuse.search(search).map(r => r.item);
  }, [species, catF, dietF, swimF, search]);

  // Phase 1: Semantic Interceptor trigger
  useEffect(() => {
    if (search && filtered.length === 0 && !loading && !isSemanticSearching) {
      const timer = setTimeout(async () => {
        setIsSemanticSearching(true);
        try {
          const result = await semanticSearchInterceptor(search);
          if (result && result.results.length > 0) {
            setSemanticResults(result.results);
            setSemanticSummary(result.summary);
          }
        } finally {
          setIsSemanticSearching(false);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!search || filtered.length > 0) {
      setSemanticResults([]);
      setSemanticSummary(null);
    }
  }, [search, filtered.length, loading]);

  const counts = useMemo(() => ({
    all: species.length,
    fish: species.filter(s => s.category === "fish").length,
    plant: species.filter(s => s.category === "plant").length,
    invertebrate: species.filter(s => s.category === "invertebrate").length,
  }), [species]);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Species Database</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse {species.length} freshwater fish, plants & invertebrates</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => router.push("/dashboard/admin")}
            >
              <RefreshCw className="w-4 h-4" />
              Manage & Sync
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or scientific name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={dietF} onValueChange={(v) => setDietF(v || "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter by Diet" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Diets</SelectItem>
              <SelectItem value="herbivore">Herbivore</SelectItem>
              <SelectItem value="omnivore">Omnivore</SelectItem>
              <SelectItem value="carnivore">Carnivore</SelectItem>
            </SelectContent>
          </Select>
          <Select value={swimF} onValueChange={(v) => setSwimF(v || "all")}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by Swim Zone" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="middle">Middle</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Tabs value={catF} onValueChange={setCatF}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">All <Badge variant="secondary" className="ml-1 text-xs h-5">{counts.all}</Badge></TabsTrigger>
            <TabsTrigger value="fish" className="gap-1"><Fish className="w-3.5 h-3.5" /> Fish <Badge variant="secondary" className="ml-1 text-xs h-5">{counts.fish}</Badge></TabsTrigger>
            <TabsTrigger value="plant" className="gap-1"><Leaf className="w-3.5 h-3.5" /> Plants <Badge variant="secondary" className="ml-1 text-xs h-5">{counts.plant}</Badge></TabsTrigger>
            <TabsTrigger value="invertebrate" className="gap-1"><Bug className="w-3.5 h-3.5" /> Inverts <Badge variant="secondary" className="ml-1 text-xs h-5">{counts.invertebrate}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="liquid-glass border-border/50 h-[300px]">
              <Skeleton className="w-full h-40" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12"
              >
                <Card className="liquid-glass border-border/50 bg-card/80 backdrop-blur-md overflow-hidden max-w-2xl mx-auto">
                  <CardContent className="p-12 text-center">
                    <div className="flex flex-col items-center gap-6">
                      {isSemanticSearching ? (
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-4 border-ocean-500/20 border-t-ocean-500 animate-spin" />
                          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-ocean-500 animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                          <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">
                          {isSemanticSearching ? "Consulting AI Interceptor..." : `No results for "${search}"`}
                        </h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">
                          {isSemanticSearching 
                            ? "Our LLM agent is analyzing your query to find semantically similar species..."
                            : "We couldn't find an exact match in our local database."}
                        </p>
                      </div>

                      {!isSemanticSearching && (
                        <div className="flex flex-wrap justify-center gap-3">
                          {isAdmin && (
                            <Button 
                              className="gap-2 bg-gradient-to-r from-indigo-600 to-ocean-600 hover:shadow-lg hover:shadow-indigo-500/20" 
                              onClick={() => {
                                setNewSpec({ ...newSpec, common_name: search });
                                setShowAdd(true);
                              }}
                            >
                              <Plus className="w-4 h-4" />
                              Manual Entry
                            </Button>
                          )}
                          <Button 
                            variant="outline"
                            className="gap-2 border-indigo-200/50 hover:bg-indigo-50/50" 
                            onClick={handleGlobalSearch}
                            disabled={fbLoading}
                          >
                            <DbIcon className={`w-4 h-4 ${fbLoading ? 'animate-spin' : ''}`} />
                            {fbLoading ? "Querying FishBase..." : "Search Global Index"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Phase 1: Semantic Results display */}
                {semanticResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 space-y-6"
                  >
                    <div className="flex items-center gap-3 p-4 liquid-glass bg-ocean-500/5 border-ocean-500/20 rounded-xl">
                      <Sparkles className="w-5 h-5 text-ocean-500" />
                      <div>
                        <p className="text-sm font-bold text-ocean-900 dark:text-ocean-100">Semantic AI Match</p>
                        <p className="text-xs text-muted-foreground">{semanticSummary}</p>
                      </div>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {semanticResults.map((s) => (
                        <SpeciesCard key={s.id} species={s} onClick={setSel} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                layout
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {filtered.map((s) => (
                  <SpeciesCard key={s.id} species={s} onClick={setSel} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border/10">
            Showing {filtered.length} of {species.length} species
          </div>
        </div>
      )}

      {globalResults.length > 0 && (
        <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
            <DbIcon className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-bold">Global FishBase Results</h2>
            <Badge variant="outline" className="ml-auto">{globalResults.length} Found</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {globalResults.map((s, i) => (
              <Card key={i} className="overflow-hidden border-indigo-100 dark:border-indigo-900/30 bg-indigo-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 overflow-hidden">
                      <p className="font-bold truncate text-indigo-950 dark:text-indigo-200">{s.common_name || "Unknown Name"}</p>
                      <p className="text-xs text-muted-foreground italic truncate">{s.scientific_name}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 h-5">GLOBAL</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground border-t border-indigo-100/50 dark:border-indigo-900/30 pt-3">
                    <div className="flex items-center gap-1">
                      <Container className="w-3 h-3" />
                      <span>{s.swim_zone || "N/A"}</span>
                    </div>
                    <span>ID: {s.spec_code}</span>
                  </div>
                  <Button 
                    className="w-full h-8 text-[10px] gap-2 bg-gradient-to-r from-indigo-600 to-ocean-600 hover:shadow-lg shadow-indigo-500/10"
                    onClick={() => handleImport(s)}
                    disabled={importingIds.has(s.spec_code)}
                  >
                    {importingIds.has(s.spec_code) ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {importingIds.has(s.spec_code) ? "Generating..." : "AI Import & Generate"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}



      <Dialog open={!!sel} onOpenChange={o => {
        if (!o) {
          setSel(null);
          setIsEditing(false);
        }
      }}>
        {sel && (
          <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl">
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md p-4 border-b border-border/50 flex items-center justify-between">
              <DialogHeader className="p-0">
                <DialogTitle className="flex items-center gap-2 text-lg">{catIcon(sel?.category || "fish")}{sel?.common_name}</DialogTitle>
                {sel?.scientific_name && <p className="text-xs text-muted-foreground italic">{sel.scientific_name}</p>}
              </DialogHeader>
            </div>
            <div className="p-4 space-y-4">
              {sel?.image_url && (
                <div className="w-full aspect-video rounded-xl overflow-hidden border border-border/50 shadow-inner bg-muted">
                  <img 
                    src={sel.image_url} 
                    alt={sel?.common_name || "Species"} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&q=80&w=800&q=fish";
                    }}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="capitalize gap-1 text-[10px]">{catIcon(sel?.category || "fish")}{sel?.category}</Badge>
                {sel?.aggression_level && <Badge variant="outline" className={`capitalize text-[10px] ${aggrColor(sel.aggression_level)}`}><Shield className="w-3 h-3 mr-1" />{sel.aggression_level}</Badge>}
                {sel?.care_difficulty && <Badge variant="outline" className={`capitalize text-[10px] ${diffColor(sel.care_difficulty)}`}><Heart className="w-3 h-3 mr-1" />{sel.care_difficulty}</Badge>}
                {sel?.swim_zone && <Badge variant="outline" className="capitalize text-[10px]">{sel.swim_zone}</Badge>}
                {sel?.diet && <Badge variant="outline" className="capitalize text-[10px]">{sel.diet}</Badge>}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Min Temp (°C)</Label>
                    <Input type="number" bs-data-id="temp-min" value={sel.temp_min_c || ""} onChange={e => setSel({...sel, temp_min_c: parseInt(e.target.value)})} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Max Temp (°C)</Label>
                    <Input type="number" bs-data-id="temp-max" value={sel.temp_max_c || ""} onChange={e => setSel({...sel, temp_max_c: parseInt(e.target.value)})} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Min pH</Label>
                    <Input type="number" step="0.1" bs-data-id="ph-min" value={sel.ph_min || ""} onChange={e => setSel({...sel, ph_min: parseFloat(e.target.value)})} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Max pH</Label>
                    <Input type="number" step="0.1" bs-data-id="ph-max" value={sel.ph_max || ""} onChange={e => setSel({...sel, ph_max: parseFloat(e.target.value)})} className="h-8 text-xs" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Notes / Biology</Label>
                    <textarea 
                      className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                      value={sel.notes || ""} 
                      onChange={e => setSel({...sel, notes: e.target.value})}
                    />
                  </div>
                  <Button className="col-span-2 h-9 text-xs gap-2" onClick={handleSaveEdit} disabled={isSaving}>
                    {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Save Changes
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/30">
                      <Ruler className="w-3.5 h-3.5 text-ocean-500" /><div><p className="text-[10px] text-muted-foreground">Max Size</p><p className="text-xs font-medium">{sel?.max_size_cm ? `${sel.max_size_cm} cm` : "—"}</p></div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/30">
                      <Container className="w-3.5 h-3.5 text-ocean-500" /><div><p className="text-[10px] text-muted-foreground">Min Tank</p><p className="text-xs font-medium">{sel?.min_tank_gallons ? `${sel.min_tank_gallons} gal` : "—"}</p></div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/30">
                      <Thermometer className="w-3.5 h-3.5 text-coral" /><div><p className="text-[10px] text-muted-foreground">Temperature</p><p className="text-xs font-medium">{sel?.temp_min_c && sel?.temp_max_c ? `${sel.temp_min_c}–${sel.temp_max_c}°C` : "—"}</p></div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/30">
                      <div className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold text-reef">pH</div><div><p className="text-[10px] text-muted-foreground">pH Range</p><p className="text-xs font-medium">{sel?.ph_min && sel?.ph_max ? `${sel.ph_min}–${sel.ph_max}` : "—"}</p></div>
                    </div>
                  </div>
                  {sel?.notes && <div className="p-3 rounded-lg bg-muted/30 border border-border/50"><p className="text-xs leading-relaxed text-muted-foreground">{sel.notes}</p></div>}
                  {isAdmin && (
                    <Button variant="outline" size="sm" className="w-full h-8 text-[10px] gap-2 border-dashed" onClick={() => setIsEditing(true)}>
                      <RefreshCw className="w-3 h-3" />
                      Refine Missing Info
                    </Button>
                  )}
                </>
              )}
              {sel?.fishbase_url && (
                <a 
                  href={sel.fishbase_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-[10px] text-ocean-500 hover:underline pt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on FishBase
                </a>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Species</DialogTitle>
            <p className="text-sm text-muted-foreground">Contribute to the global database.</p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="common_name">Common Name</Label>
              <Input 
                id="common_name" 
                value={newSpec.common_name} 
                onChange={e => setNewSpec({...newSpec, common_name: e.target.value})}
                placeholder="e.g. Red Devil Angelfish"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={newSpec.category} onValueChange={(v: any) => setNewSpec({...newSpec, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fish">Fish</SelectItem>
                    <SelectItem value="plant">Plant</SelectItem>
                    <SelectItem value="invertebrate">Invertebrate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Aggression</Label>
                <Select value={newSpec.aggression_level} onValueChange={(v: any) => setNewSpec({...newSpec, aggression_level: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="peaceful">Peaceful</SelectItem>
                    <SelectItem value="semi-aggressive">Semi-Aggressive</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="min_tank">Min Tank (Gal)</Label>
                <Input 
                  id="min_tank" 
                  type="number"
                  value={newSpec.min_tank_gallons || ""} 
                  onChange={e => setNewSpec({...newSpec, min_tank_gallons: parseInt(e.target.value)})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max_size">Max Size (cm)</Label>
                <Input 
                  id="max_size" 
                  type="number"
                  value={newSpec.max_size_cm || ""} 
                  onChange={e => setNewSpec({...newSpec, max_size_cm: parseInt(e.target.value)})}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700" 
              onClick={handleAddSpecies}
              disabled={isSaving || !newSpec.common_name}
            >
              {isSaving ? "Saving..." : "Add Species"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  );
}
