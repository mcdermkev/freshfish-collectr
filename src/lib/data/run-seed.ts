import { MASTER_SPECIES_LIST } from "./master-species";
import { seedLocalSpecies } from "../seed-species";

async function runBatchSeed() {
  console.log("🌊 Preparing Master Species Batch Upload...");
  
  // Take first 50 (or all if less)
  const batch = MASTER_SPECIES_LIST.slice(0, 50).map(species => {
    // Force specific URL for Java Moss as requested
    if (species.common_name === "Java Moss") {
      species.image_url = "https://images.unsplash.com/photo-1506452305024-9d3f02d1c9b5?auto=format&fit=crop&q=80&w=800";
    } else if (!species.image_url) {
      const suffix = species.category === 'plant' ? 'aquatic plant' : 'aquarium fish';
      const query = encodeURIComponent(`${species.common_name} ${suffix}`);
      species.image_url = `https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&q=80&w=800&q=fish,${query}`;
    }
    return species;
  });

  try {
    await seedLocalSpecies(batch);
    console.log("⭐ Batch upload complete!");
  } catch (error) {
    console.error("💥 Batch upload failed:", error);
  }
}

runBatchSeed();
