"use server";

import { GoogleAuth } from 'google-auth-library';
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Standard Google Cloud Project configuration
const projectId = process.env.GOOGLE_CLOUD_PROJECT || "getnexusaisolutions";
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1"; // Using us-central1 for stable Imagen 4 availability
const modelId = "imagen-4.0-generate-001";

// Auth initialization helper
async function getAuthToken() {
  if (!process.env.GOOGLE_CREDENTIALS_JSON) {
    throw new Error('CRITICAL: GOOGLE_CREDENTIALS_JSON is missing from environment variables');
  }

  try {
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    const auth = new GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key.split(String.raw`\n`).join('\n'),
        project_id: creds.project_id
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    if (!token.token) throw new Error("Failed to retrieve access token");
    
    return { token: token.token, projectId: creds.project_id };
  } catch (err: any) {
    console.error("[Imagen REST Auth] Failed to prepare auth:", err.message);
    throw new Error(`Authentication Setup Failed: ${err.message}`);
  }
}

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
      const { token, projectId: authProjectId } = await getAuthToken();
      
      // Using the user-specified stable REST endpoint
      const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${authProjectId}/locations/${location}/publishers/google/models/imagegeneration@006:predict`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vertex AI REST Error (${response.status} ${response.statusText}): ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.predictions || result.predictions.length === 0) {
        throw new Error("No predictions returned from Vertex AI REST");
      }

      const prediction = result.predictions[0];
      const base64Image = prediction.bytesBase64Encoded;

      if (!base64Image) {
        throw new Error("Image data missing in REST prediction");
      }

      const dataUrl = `data:image/png;base64,${base64Image}`;
      console.log(`[Imagen REST] Generation successful for ${speciesName}.`);
      return dataUrl;
    } catch (error: any) {
      const isRateLimit = error.message?.includes("429");
      
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
