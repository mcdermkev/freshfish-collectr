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

      return base64Image;
    } catch (error: any) {
      const isRateLimit = error.message?.includes("429") || error.code === 8;
      
      if (attempt < retries && isRateLimit) {
        const waitTime = backoff * Math.pow(2, attempt);
        console.warn(`[Imagen 4] Rate limited. Retrying in ${waitTime}ms... (Attempt ${attempt + 1}/${retries})`);
        await sleep(waitTime);
        continue;
      }
      
      console.error(`[Imagen 4 Error] Final failure after ${attempt} retries:`, error.message);
      return null;
    }
  }
  return null;
}

/**
 * Iterates through species with a 3-second safety delay between generations
 */
export async function refreshAllSpeciesImages() {
  const supabase = await createServerSupabaseClient();
  
  const { data: species, error } = await (supabase.from("species") as any)
    .select("*")
    .or("image_url.is.null,image_url.ilike.%placeholder%");

  if (error) throw error;
  if (!species || species.length === 0) return { message: "No species found needing image refresh." };

  console.log(`[Maintenance] Starting sync for ${species.length} species with 3s interval...`);

  let successCount = 0;
  let failCount = 0;

  for (const s of species) {
    try {
      // 1. Safety delay to avoid hitting rate limits proactively
      if (successCount > 0 || failCount > 0) {
        await sleep(3000); 
      }

      // 2. Generate Image
      const base64Data = await generateSpeciesImage(s.common_name, s.scientific_name);
      if (!base64Data) throw new Error("Generation failed after retries");

      // 3. Convert to Buffer
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${s.id}-${Date.now()}.png`;

      // 4. Upload
      const { error: uploadError } = await supabase.storage
        .from("species-images")
        .upload(fileName, buffer, {
          contentType: "image/png",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 5. Update DB
      const { data: urlData } = supabase.storage
        .from("species-images")
        .getPublicUrl(fileName);

      const { error: updateError } = await (supabase.from("species") as any)
        .update({ image_url: urlData.publicUrl })
        .eq("id", s.id);

      if (updateError) throw updateError;

      successCount++;
    } catch (err) {
      console.error(`[Maintenance] Failed to refresh ${s.common_name}:`, err);
      failCount++;
    }
  }

  revalidatePath("/dashboard/species");
  return { 
    message: `Image sync complete.`,
    stats: { success: successCount, failed: failCount }
  };
}
