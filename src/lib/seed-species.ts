import { supabaseAdmin } from "./supabase/admin";

/**
 * Admin Seeder Script
 * 
 * Usage: 
 * 1. Pass an array of species objects to seedLocalSpecies()
 * 2. Run this from a secure admin environment or a temporary route.
 */

export interface SeedSpeciesInput {
  common_name: string;
  scientific_name?: string;
  category: "fish" | "plant" | "invertebrate";
  max_size_cm?: number;
  min_tank_gallons?: number;
  temp_min_c?: number;
  temp_max_c?: number;
  ph_min?: number;
  ph_max?: number;
  aggression_level?: "peaceful" | "semi-aggressive" | "aggressive";
  care_difficulty?: "beginner" | "easy" | "intermediate" | "advanced";
  swim_zone?: string;
  diet?: string;
  notes?: string;
  image_url?: string;
  fishbase_url?: string;
}

export async function seedLocalSpecies(speciesList: SeedSpeciesInput[]) {
  console.log(`🚀 Starting bulk seed of ${speciesList.length} species using Admin Client...`);
  
  const { data, error } = await (supabaseAdmin.from("species") as any)
    .upsert(
      speciesList.map(s => ({
        ...s,
        created_at: new Date().toISOString()
      })), 
      { onConflict: "common_name" }
    )
    .select("id");

  if (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }

  console.log(`✅ Successfully seeded ${data?.length} records!`);
  return data;
}

export const SAMPLE_SPECIES: SeedSpeciesInput[] = [
  {
    common_name: "Neon Tetra",
    scientific_name: "Paracheirodon innesi",
    category: "fish",
    max_size_cm: 4,
    min_tank_gallons: 10,
    temp_min_c: 20,
    temp_max_c: 26,
    ph_min: 6.0,
    ph_max: 7.0,
    aggression_level: "peaceful",
    care_difficulty: "beginner",
    swim_zone: "middle",
    diet: "omnivore",
    notes: "Classic schooling fish. Keep in groups of 8+."
  },
  {
    common_name: "Cherry Shrimp",
    scientific_name: "Neocaridina davidi",
    category: "invertebrate",
    max_size_cm: 3,
    min_tank_gallons: 5,
    temp_min_c: 18,
    temp_max_c: 28,
    ph_min: 6.5,
    ph_max: 8.0,
    aggression_level: "peaceful",
    care_difficulty: "beginner",
    swim_zone: "bottom",
    diet: "omnivore",
    notes: "Hardy dwarf shrimp. Excellent algae cleaners."
  }
];
