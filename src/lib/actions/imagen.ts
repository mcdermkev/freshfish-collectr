"use server";

import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Standard Google Cloud Project configuration
const projectId = process.env.GOOGLE_CLOUD_PROJECT || "freshfish-collectr";
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const modelId = "imagen-4.0-generate-001";

const client = new PredictionServiceClient({
  apiEndpoint: `${location}-aiplatform.googleapis.com`,
});

export async function generateSpeciesImage(speciesName: string, scientificName?: string) {
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${modelId}`;

  const prompt = scientificName 
    ? `Ultra-high definition macro photography of a ${speciesName} (${scientificName}) in a natural freshwater aquarium, professional lighting, 8k.`
    : `Photorealistic macro photography of ${speciesName} fish, aquarium lighting, 8k resolution.`;

  const instance = helpers.toValue({
    prompt: prompt,
  });
  const instances = [instance];

  const parameter = helpers.toValue({
    sampleCount: 1,
    aspectRatio: "16:9",
  });

  const request: any = {
    endpoint,
    instances,
    parameters: parameter,
  };

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

    return base64Image; // Return raw base64 for processing
  } catch (error) {
    console.error("[Imagen 4 Error]:", error);
    return null;
  }
}

export async function refreshAllSpeciesImages() {
  const supabase = await createServerSupabaseClient();
  
  // 1. Query species missing images
  const { data: species, error } = await (supabase.from("species") as any)
    .select("*")
    .or("image_url.is.null,image_url.ilike.%placeholder%");

  if (error) throw error;
  if (!species || species.length === 0) return { message: "No species found needing image refresh." };

  console.log(`[Maintenance] Refreshing images for ${species.length} species...`);

  let successCount = 0;
  let failCount = 0;

  for (const s of species) {
    try {
      // 2. Generate Image
      const base64Data = await generateSpeciesImage(s.common_name, s.scientific_name);
      if (!base64Data) throw new Error("Generation failed");

      // 3. Convert to Buffer for upload
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${s.id}-${Date.now()}.png`;

      // 4. Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("species-images")
        .upload(fileName, buffer, {
          contentType: "image/png",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 5. Get Public URL
      const { data: urlData } = supabase.storage
        .from("species-images")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // 6. Update Database
      const { error: updateError } = await (supabase.from("species") as any)
        .update({ image_url: publicUrl })
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
