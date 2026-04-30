import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Fish, Leaf, Bug, Thermometer, Ruler, Container, 
  Shield, Heart, ArrowLeft, ExternalLink 
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SpeciesDetailPageProps {
  params: Promise<{ id: string }>;
}

const aggrColor = (l: string | null) => {
  if (l === "peaceful") return "bg-green-500/15 text-green-600 border-green-500/20";
  if (l === "semi-aggressive") return "bg-yellow-500/15 text-yellow-600 border-yellow-500/20";
  if (l === "aggressive") return "bg-red-500/15 text-red-600 border-red-500/20";
  return "";
};

const diffColor = (l: string | null) => {
  if (l === "beginner" || l === "easy") return "bg-green-500/15 text-green-600 border-green-500/20";
  if (l === "intermediate") return "bg-blue-500/15 text-blue-600 border-blue-500/20";
  if (l === "advanced") return "bg-red-500/15 text-red-600 border-red-500/20";
  return "";
};

const catIcon = (c: string) => {
  if (c === "fish") return <Fish className="w-5 h-5 text-ocean-500" />;
  if (c === "plant") return <Leaf className="w-5 h-5 text-aqua-500" />;
  if (c === "invertebrate") return <Bug className="w-5 h-5 text-coral" />;
  return null;
};

export default async function SpeciesDetailPage({ params }: SpeciesDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: species, error } = await (supabase.from("species") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !species) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dashboard/species">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            {catIcon(species.category)}
            {species.common_name}
          </h1>
          <p className="text-muted-foreground italic text-lg">{species.scientific_name}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="liquid-glass rounded-2xl overflow-hidden border border-border/50 aspect-video relative group bg-muted">
            <img 
              src={(species.image_url && !species.image_url.includes("unsplash.com")) ? species.image_url : "/images/placeholder-species.png"} 
              alt={species.common_name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {(!species.image_url || species.image_url.includes("unsplash.com")) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-ocean-900/40 to-slate-900/60 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 shadow-2xl backdrop-blur-sm">
                  {catIcon(species.category)}
                </div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
                  Scientific Sketch Rendering
                </p>
                <p className="text-sm text-white/60 italic mt-1 px-4">
                  {species.scientific_name || "Unknown Species"}
                </p>
                <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`px-4 py-1.5 capitalize rounded-full ${aggrColor(species.aggression_level)}`}>
              <Shield className="w-4 h-4 mr-2" />
              {species.aggression_level || "Unknown Behavior"}
            </Badge>
            <Badge variant="outline" className={`px-4 py-1.5 capitalize rounded-full ${diffColor(species.care_difficulty)}`}>
              <Heart className="w-4 h-4 mr-2" />
              {species.care_difficulty || "Unknown Difficulty"}
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="liquid-glass border-border/50 bg-card/50">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                    <Thermometer className="w-3.5 h-3.5 text-coral" />
                    Temperature
                  </p>
                  <p className="text-xl font-semibold">
                    {species.temp_min_c && species.temp_max_c ? `${species.temp_min_c}–${species.temp_max_c}°C` : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                    <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-reef">pH</span>
                    pH Range
                  </p>
                  <p className="text-xl font-semibold">
                    {species.ph_min && species.ph_max ? `${species.ph_min}–${species.ph_max}` : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                    <Ruler className="w-3.5 h-3.5 text-ocean-500" />
                    Max Size
                  </p>
                  <p className="text-xl font-semibold">
                    {species.max_size_cm ? `${species.max_size_cm} cm` : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                    <Container className="w-3.5 h-3.5 text-ocean-500" />
                    Min Tank
                  </p>
                  <p className="text-xl font-semibold">
                    {species.min_tank_gallons ? `${species.min_tank_gallons} gal` : "N/A"}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-border/30">
                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-3">Biology & Notes</h3>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {species.notes || "No detailed notes available for this species."}
                </p>
              </div>

              {species.fishbase_url && (
                <Button variant="outline" className="w-full gap-2 rounded-xl" asChild>
                  <a href={species.fishbase_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    View Official FishBase Records
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
