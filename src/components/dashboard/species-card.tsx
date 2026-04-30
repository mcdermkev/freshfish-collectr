"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Fish, Leaf, Bug, Thermometer, Container, 
  Shield, Heart, Info, RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { Species } from "@/lib/types/database";
import { generateSpeciesImage } from "@/lib/actions/imagen";
import { cn } from "@/lib/utils";

interface SpeciesCardProps {
  species: Species;
  onClick?: (species: Species) => void;
}

const aggrColor = (l: string | null) => {
  if (l === "peaceful") return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20";
  if (l === "semi-aggressive") return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
  if (l === "aggressive") return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20";
  return "bg-slate-500/15 text-slate-600 border-slate-500/20";
};

const diffColor = (l: string | null) => {
  if (l === "beginner" || l === "easy") return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20";
  if (l === "intermediate") return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20";
  if (l === "advanced") return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20";
  return "bg-slate-500/15 text-slate-600 border-slate-500/20";
};

const catIcon = (c: string) => {
  if (c === "fish") return <Fish className="w-4 h-4 text-ocean-500" />;
  if (c === "plant") return <Leaf className="w-4 h-4 text-aqua-500" />;
  if (c === "invertebrate") return <Bug className="w-4 h-4 text-coral" />;
  return <Info className="w-4 h-4" />;
};

export function SpeciesCard({ species, onClick }: SpeciesCardProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(species.image_url);
  const [imgLoading, setImgLoading] = useState(!!species.image_url);
  const [usePlaceholder, setUsePlaceholder] = useState(!species.image_url);

  useEffect(() => {
    async function handleImage() {
      // Ignore stock photos to force unique AI generation
      const isStockPhoto = species.image_url?.includes("unsplash.com");
      
      if (species.image_url && !isStockPhoto) {
        setImgUrl(species.image_url);
        setUsePlaceholder(false);
        setImgLoading(true);
      } else {
        await handleManualRefresh();
      }
    }
    handleImage();
  }, [species.image_url, species.common_name]);

  const handleManualRefresh = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImgLoading(true);
    setUsePlaceholder(false);
    
    try {
      const generatedUrl = await generateSpeciesImage(species.common_name, species.scientific_name);
      if (generatedUrl) {
        setImgUrl(generatedUrl);
        setUsePlaceholder(false);
      } else {
        setUsePlaceholder(true);
      }
    } catch (err) {
      console.error("Manual refresh failed:", err);
      setUsePlaceholder(true);
    } finally {
      setImgLoading(false);
    }
  };

  const handleImgError = () => {
    console.warn(`Image failed for ${species.common_name}, falling back to placeholder`);
    setUsePlaceholder(true);
    setImgLoading(false);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full"
    >
      <Card 
        className="liquid-glass hover-glow scale-3d h-full overflow-hidden cursor-pointer group flex flex-col"
        onClick={() => onClick?.(species)}
      >
        <div className="relative aspect-video overflow-hidden bg-muted/20">
          <AnimatePresence mode="wait">
            {imgLoading && (
              <motion.div 
                key="skeleton"
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10"
              >
                <Skeleton className="w-full h-full" />
              </motion.div>
            )}
            
            {usePlaceholder ? (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-ocean-900/40 to-slate-900/60 p-4 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-2xl backdrop-blur-sm">
                  {catIcon(species.category)}
                </div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
                  Scientific Sketch Rendering
                </p>
                <p className="text-xs text-white/60 italic mt-1 px-4 line-clamp-2">
                  {species.scientific_name || "Unknown Species"}
                </p>
                {/* Stylized AI "Sketch" overlay */}
                <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
              </motion.div>
            ) : (
              <motion.img
                key="image"
                src={imgUrl!}
                alt={species.common_name}
                onLoad={() => setImgLoading(false)}
                onError={handleImgError}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                  imgLoading ? "opacity-0" : "opacity-100"
                )}
              />
            )}
          </AnimatePresence>
          
          <div className="absolute top-2 right-2 flex gap-1">
            <Badge variant="secondary" className="liquid-glass text-[10px] backdrop-blur-md bg-black/40 text-white border-white/10">
              {species.category}
            </Badge>
          </div>

          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 border border-white/10"
              onClick={handleManualRefresh}
              disabled={imgLoading}
            >
              <RefreshCw className={cn("w-4 h-4", imgLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col gap-3">
          <div className="space-y-1">
            <h3 className="font-bold text-lg leading-tight group-hover:text-ocean-400 transition-colors">
              {species.common_name}
            </h3>
            <p className="text-xs text-muted-foreground italic line-clamp-1">
              {species.scientific_name}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-auto">
            {species.aggression_level && (
              <Badge variant="outline" className={cn("text-[10px] uppercase py-0 px-1.5", aggrColor(species.aggression_level))}>
                <Shield className="w-2.5 h-2.5 mr-1" />
                {species.aggression_level}
              </Badge>
            )}
            {species.care_difficulty && (
              <Badge variant="outline" className={cn("text-[10px] uppercase py-0 px-1.5", diffColor(species.care_difficulty))}>
                <Heart className="w-2.5 h-2.5 mr-1" />
                {species.care_difficulty}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3 h-3 text-coral" />
              <span className="text-[10px] text-muted-foreground">
                {species.temp_min_c && species.temp_max_c ? `${species.temp_min_c}-${species.temp_max_c}°C` : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Container className="w-3 h-3 text-ocean-400" />
              <span className="text-[10px] text-muted-foreground">
                {species.min_tank_gallons ? `${species.min_tank_gallons} gal` : "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
