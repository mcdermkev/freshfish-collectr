import { MASTER_SPECIES_LIST } from "./master-species";
import { seedLocalSpecies } from "../seed-species";

async function runBatchSeed() {
  console.log("🌊 Preparing Master Species Batch Upload...");
  
  // Take first 50 (or all if less)
  const batch = MASTER_SPECIES_LIST.slice(0, 50).map(species => {
    // If it's a stock photo, clear it to force AI generation
    if (species.image_url?.includes("unsplash.com")) {
      species.image_url = undefined;
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
