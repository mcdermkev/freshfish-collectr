"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Plus, Database, Sparkles, Image as ImageIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { MASTER_SPECIES_LIST } from "@/lib/data/master-species";
import { refreshAllSpeciesImages } from "@/lib/actions/imagen";

export default function AdminFormClient() {
  const supabase = createClient();
  const router = useRouter();
  const [formLoading, setFormLoading] = useState(false);
  const [bulkJson, setBulkJson] = useState("");

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const speciesData = {
      common_name: formData.get("common_name"),
      scientific_name: formData.get("scientific_name"),
      category: formData.get("category"),
      temp_min_c: formData.get("temp_min_c") ? parseFloat(formData.get("temp_min_c") as string) : null,
      temp_max_c: formData.get("temp_max_c") ? parseFloat(formData.get("temp_max_c") as string) : null,
      ph_min: formData.get("ph_min") ? parseFloat(formData.get("ph_min") as string) : null,
      ph_max: formData.get("ph_max") ? parseFloat(formData.get("ph_max") as string) : null,
      aggression_level: formData.get("aggression_level"),
      care_difficulty: formData.get("care_difficulty"),
      image_url: formData.get("image_url") || null,
    };

    const { error } = await (supabase.from("species") as any).insert(speciesData);

    if (error) {
      toast.error("Failed to add species: " + error.message);
    } else {
      toast.success("Species added successfully!");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
    setFormLoading(false);
  };

  const handleBulkSeed = async () => {
    if (!bulkJson.trim()) {
      toast.error("Please provide JSON data");
      return;
    }
    try {
      const species = JSON.parse(bulkJson);
      const res = await fetch("/api/admin/bulk-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ species }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(data.message);
      setBulkJson("");
      router.refresh();
    } catch (err: any) {
      toast.error("Bulk seed failed: " + err.message);
    }
  };
  
  const handleMasterSeed = async () => {
    setFormLoading(true);
    try {
      const res = await fetch("/api/admin/bulk-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ species: MASTER_SPECIES_LIST }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Master Encyclopedia Initialized! 📚✨");
      router.refresh();
    } catch (err: any) {
      toast.error("Master seed failed: " + err.message);
    }
    setFormLoading(false);
  };
  
  const handleRefreshImages = async () => {
    setFormLoading(true);
    const promise = refreshAllSpeciesImages();
    
    toast.promise(promise, {
      loading: "Initializing Imagen 4.0 & Scanning Database...",
      success: (data: any) => {
        return `${data.message} ${data.stats ? `(${data.stats.success} succeeded, ${data.stats.failed} failed)` : ""}`;
      },
      error: "Image sync failed. Check console for details.",
    });

    try {
      await promise;
      router.refresh();
    } catch (err) {
      console.error(err);
    }
    setFormLoading(false);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* AI Image Mastery */}
      <Card className="md:col-span-2 border-ocean-500/30 bg-gradient-to-br from-card via-ocean-500/5 to-card shadow-2xl shadow-ocean-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-ocean-600 to-reef bg-clip-text text-transparent">
            <RefreshCw className="w-6 h-6 text-ocean-600 animate-spin-slow" />
            Vertex AI Media Synchronization
          </CardTitle>
          <CardDescription>
            Scan the entire database for species missing imagery and generate photorealistic 8k macro photography using Google Imagen 4.0.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 space-y-2 text-sm text-muted-foreground">
            <p>• Uses <strong>imagen-4.0-generate-001</strong> for ultra-HD aquatic realism.</p>
            <p>• Automatically uploads to <code>species-images</code> storage bucket.</p>
            <p>• Updates <code>image_url</code> permanently in the Supabase table.</p>
          </div>
          <Button 
            size="lg"
            className="w-full md:w-auto px-8 bg-ocean-600 hover:bg-ocean-700 text-white shadow-lg shadow-ocean-600/20 gap-2"
            onClick={handleRefreshImages}
            disabled={formLoading}
          >
            {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Sync All Missing Images
          </Button>
        </CardContent>
      </Card>

      {/* Manual Entry */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Plus className="w-5 h-5 text-primary" />
            Manual Species Entry
          </CardTitle>
          <CardDescription>Add a single species to the global encyclopedia.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="common_name">Common Name</Label>
                <Input id="common_name" name="common_name" placeholder="Neon Tetra" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scientific_name">Scientific Name</Label>
                <Input id="scientific_name" name="scientific_name" placeholder="Paracheirodon innesi" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" placeholder="fish" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="care_difficulty">Care Difficulty</Label>
                <Input id="care_difficulty" name="care_difficulty" placeholder="easy" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temp_min_c">Temp Min°C</Label>
                <Input id="temp_min_c" name="temp_min_c" type="number" step="0.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp_max_c">Temp Max°C</Label>
                <Input id="temp_max_c" name="temp_max_c" type="number" step="0.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ph_min">pH Min</Label>
                <Input id="ph_min" name="ph_min" type="number" step="0.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ph_max">pH Max</Label>
                <Input id="ph_max" name="ph_max" type="number" step="0.1" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input id="image_url" name="image_url" placeholder="https://unsplash.com/..." />
            </div>

            <Button type="submit" disabled={formLoading} className="w-full">
              {formLoading ? "Adding..." : "Add Species"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Bulk Seeder */}
      <div className="space-y-8">
        <Card className="border-reef/30 bg-gradient-to-br from-card to-reef/5 shadow-xl shadow-reef/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-reef" />
              Master Initialization
            </CardTitle>
            <CardDescription>Populate the database with the core "Master List" of 20+ species including high-res images.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full bg-gradient-to-r from-reef to-ocean-600 text-white font-bold h-12 shadow-lg shadow-reef/20"
              onClick={handleMasterSeed}
              disabled={formLoading}
            >
              {formLoading ? "Seeding Master Records..." : "Run Master Initializer"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Database className="w-5 h-5 text-muted-foreground" />
              Custom Bulk Import
            </CardTitle>
            <CardDescription>Paste a custom JSON array for targeted imports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder='[ { "common_name": "Neon Tetra", ... }, ... ]'
              rows={6}
              className="font-mono text-xs"
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
            />
            <Button 
              variant="outline"
              className="w-full"
              onClick={handleBulkSeed}
              disabled={formLoading}
            >
              Import Custom JSON
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
