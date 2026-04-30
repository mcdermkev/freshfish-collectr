"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fish, Leaf, Bug, Shield, Heart, RefreshCw, Trash2, Camera, Thermometer } from "lucide-react";
import { motion } from "framer-motion";
import type { TankLivestockWithSpecies } from "@/lib/types/database";
import { Button } from "@/components/ui/button";

interface LivestockCardProps {
  item: TankLivestockWithSpecies;
  onUpdateStatus?: (item: TankLivestockWithSpecies) => void;
  onRemove?: (id: string, name: string) => void;
  onUploadPhoto?: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading?: string | null;
}

const aggrColor = (l: string | null) => {
  if (l === "peaceful") return "bg-green-500/15 text-green-600 border-green-500/20";
  if (l === "semi-aggressive") return "bg-yellow-500/15 text-yellow-600 border-yellow-500/20";
  if (l === "aggressive") return "bg-red-500/15 text-red-600 border-red-500/20";
  return "bg-slate-500/15 text-slate-600 border-slate-500/20";
};

export function LivestockCard({ item, onUpdateStatus, onRemove, onUploadPhoto, uploading }: LivestockCardProps) {
  const species = item.species;
  const name = item.nickname || species.common_name;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full"
    >
      <Card className="liquid-glass overflow-hidden h-full flex flex-col group border-border/40">
        <div className="relative aspect-video overflow-hidden">
          {species.image_url ? (
            <img 
              src={species.image_url} 
              alt={name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ocean-900 to-slate-900 flex flex-col items-center justify-center p-4">
              <Fish className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Image Sync Pending</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5">
            <Badge className="bg-ocean-600 text-white border-none shadow-lg">
              x{item.quantity}
            </Badge>
            <Badge variant="outline" className="backdrop-blur-md bg-black/40 text-white border-white/10 uppercase text-[9px] tracking-widest font-bold">
              {item.status}
            </Badge>
          </div>

          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
            <div className="space-y-0.5">
              <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md truncate max-w-[150px]">
                {name}
              </h3>
              {item.nickname && (
                <p className="text-white/60 text-[10px] italic drop-shadow-sm truncate max-w-[150px]">
                  {species.common_name}
                </p>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {species.aggression_level && (
              <Badge variant="outline" className={`text-[10px] uppercase py-0 px-1.5 ${aggrColor(species.aggression_level)}`}>
                <Shield className="w-2.5 h-2.5 mr-1" />
                {species.aggression_level}
              </Badge>
            )}
            {item.life_stage && item.life_stage !== "adult" && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize bg-purple-500/10 text-purple-600 border-purple-500/20">
                {item.life_stage}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-foreground border-t border-border/10 pt-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-3.5 h-3.5 text-coral" />
              <span>{species.temp_min_c}–{species.temp_max_c}°C</span>
            </div>
            {item.purchase_date && (
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[10px] uppercase font-bold text-muted-foreground/50">Joined</span>
                <span className="font-medium">{new Date(item.purchase_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-auto pt-2">
            <Button 
              size="sm" 
              variant="secondary" 
              className="flex-1 h-8 text-[10px] gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              onClick={() => onUpdateStatus?.(item)}
            >
              <RefreshCw className="w-3 h-3" />
              Status
            </Button>
            <label className="cursor-pointer">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <Camera className="w-4 h-4 text-primary" />
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => onUploadPhoto?.(item.id, e)}
                disabled={uploading === item.id}
              />
            </label>
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-8 h-8 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10"
              onClick={() => onRemove?.(item.id, name)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
