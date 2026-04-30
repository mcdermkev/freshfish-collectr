"use server";

import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Standard Google Cloud Project configuration
const projectId = process.env.GOOGLE_CLOUD_PROJECT || "getnexusaisolutions";
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1"; // Using us-central1 for stable Imagen 4 availability
const modelId = "imagen-4.0-generate-001";

const client = new PredictionServiceClient({
  apiEndpoint: `${location}-aiplatform.googleapis.com`,
});

// Helper for delays
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates an image with exponential backoff retry logic
 */
export async function generateSpeciesImage(
  speciesName: string, 
  scientificName?: string,
  retries = 3,
  backoff = 1000
) {
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${modelId}`;

  const prompt = scientificName 
    ? `Ultra-high definition macro photography of a ${speciesName} (${scientificName}) in a natural freshwater aquarium, professional lighting, 8k.`
    : `Photorealistic macro photography of ${speciesName} fish, aquarium lighting, 8k resolution.`;

  console.log(`>>> [Imagen 4 Request] Prompt: "${prompt}"`);

  const instance = helpers.toValue({
    prompt: prompt,
  });
  
  const parameter = helpers.toValue({
    sampleCount: 1,
    aspectRatio: "16:9",
  });

  const request: any = {
    endpoint,
    instances: [instance],
    parameters: parameter,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await client.predict(request);
      const response = result[0];
      
      if (!response || !response.predictions || response.predictions.length === 0) {
        throw new Error("No predictions returned from Imagen 4");
      }

      const prediction: any = helpers.fromValue(response.predictions[0] as any);
      const base64Image = prediction.bytesBase64Encoded;

      if (!base64Image) {
        throw new Error("Image data missing in prediction");
      }

      const dataUrl = `data:image/png;base64,${base64Image}`;
      console.log(`[Imagen 4] Generation successful for ${speciesName}. Returning data URL.`);
      return dataUrl;
    } catch (error: any) {
      const isRateLimit = error.message?.includes("429") || error.code === 8;
      
      if (attempt < retries && isRateLimit) {
        const waitTime = backoff * Math.pow(2, attempt);
        console.warn(`[Imagen 4] Rate limited. Retrying in ${waitTime}ms... (Attempt ${attempt + 1}/${retries})`);
        await sleep(waitTime);
        continue;
      }
      
      console.error(`[Imagen 4 Error] Final failure after ${attempt} retries:`, error.message);
      
      // Special check: If it failed and we have a common name that might be sensitive, try scientific only
      if (scientificName && speciesName.toLowerCase().includes("devil")) {
         console.warn(`[Imagen 4] Potential safety filter on "${speciesName}". Retrying with Scientific Name only...`);
         return generateSpeciesImage(scientificName, undefined, 1, 500);
      }

      return null;
    }
  }
  return null;
}

/**
 * Syncs a specific list of species by name or ID
 */
export async function syncSpeciesBatch(ids: string[]) {
  const supabase = await createServerSupabaseClient();
  const { data: species, error } = await (supabase.from("species") as any)
    .select("*")
    .in("id", ids);

  if (error) throw error;
  if (!species || species.length === 0) return { message: "No species found for given IDs." };

  console.log(`[Maintenance] Starting targeted sync for ${species.length} species...`);
  return await processSpeciesSync(species);
}

async function processSpeciesSync(species: any[]) {
  const supabase = await createServerSupabaseClient();
  let successCount = 0;
  let failCount = 0;

  for (const s of species) {
    try {
      if (successCount > 0 || failCount > 0) await sleep(3000); 

      const dataUrl = await generateSpeciesImage(s.common_name, s.scientific_name);
      if (!dataUrl) throw new Error("Generation failed");

      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `sync-${s.id}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("species-images")
        .upload(fileName, buffer, { contentType: "image/png", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("species-images").getPublicUrl(fileName);
      const { error: updateError } = await (supabase.from("species") as any)
        .update({ image_url: urlData.publicUrl })
        .eq("id", s.id);

      if (updateError) throw updateError;
      successCount++;
    } catch (err: any) {
      console.error(`[Sync Failure] ERROR for ${s.common_name}:`, {
        message: err.message,
        code: err.code,
        stack: err.stack,
        speciesId: s.id
      });
      failCount++;
    }
  }

  revalidatePath("/dashboard/species");
  return { success: successCount, failed: failCount };
}

/**
 * Force syncs a single species image and saves to DB
 */
export async function forceSyncImage(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: s, error: fetchError } = await (supabase.from("species") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !s) throw new Error("Species not found");

  console.log(`[Force Sync] Retrying ${s.common_name}...`);
  
  const dataUrl = await generateSpeciesImage(s.common_name, s.scientific_name);
  if (!dataUrl) throw new Error("AI Generation failed. Check logs for safety filter triggers.");

  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const fileName = `force-${id}-${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from("species-images")
    .upload(fileName, buffer, { contentType: "image/png", upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("species-images").getPublicUrl(fileName);
  const { error: updateError } = await (supabase.from("species") as any)
    .update({ image_url: urlData.publicUrl })
    .eq("id", id);

  if (updateError) throw updateError;

  revalidatePath("/dashboard/species");
  return { url: urlData.publicUrl };
}

/**
 * Iterates through species with a 3-second safety delay between generations
 */
export async function refreshAllSpeciesImages() {
  const supabase = await createServerSupabaseClient();
  
  const { data: species, error } = await (supabase.from("species") as any)
    .select("*")
    .or("image_url.is.null,image_url.ilike.%placeholder%,image_url.ilike.%unsplash%");

  if (error) throw error;
  if (!species || species.length === 0) return { message: "No species found needing image refresh." };

  console.log(`[Maintenance] Starting sync for ${species.length} species with 3s interval...`);
  const stats = await processSpeciesSync(species);
  
  return { 
    message: `Image sync complete.`,
    stats
  };
}
