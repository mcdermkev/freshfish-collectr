'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { scrapeFishBase, getSpeciesDetails } from '@/lib/services/fishbase';
import { generateSpeciesImage } from '@/lib/actions/imagen';

export async function searchGlobalFishBase(searchTerm: string) {
  if (!searchTerm || searchTerm.length < 3) return [];
  try {
    return await scrapeFishBase(searchTerm);
  } catch (error) {
    console.error('[FishBase] Global Search Failed:', error);
    return [];
  }
}

export async function importSpecies(species: any) {
  const supabase = await createServerSupabaseClient();
  const commonName = species.common_name || `${species.genus} ${species.species_epithet}`;
  
  console.log(`[Import] Starting Full Enrichment for: ${commonName}`);
  
  // 1. Scraping enrichment (FishBase)
  let scrapedData: any = {};
  if (species.spec_code) {
    try {
      scrapedData = await getSpeciesDetails(species.spec_code);
    } catch (e) {
      console.warn(`[Import] Detail enrichment failed for ${species.scientific_name}`, e);
    }
  }

  // 2. AI Behavioral Mapping (Gemini 3 Flash)
  // Strict mapping to local tags as requested by the user
  let aiEnrichment: any = {};
  try {
    const { text } = await generateText({
      model: google("gemini-3-flash"),
      system: "You are an aquatic life behavior specialist. Map the species to our specific local tags.",
      prompt: `Analyze ${commonName} (${species.scientific_name}). 
      Map it strictly to these options:
      - aggression_level: "peaceful", "semi-aggressive", or "aggressive"
      - care_difficulty: "beginner", "intermediate", or "advanced"
      - diet: "herbivore", "omnivore", or "carnivore"
      
      Provide a brief 1-2 sentence bio for the 'notes' field as well.
      Return ONLY a JSON object.`,
    });
    aiEnrichment = JSON.parse(text);
  } catch (err) {
    console.warn("[Import] AI behavioral enrichment failed:", err);
  }

  // 3. Instant HD Image Generation (Imagen 4.0)
  let finalImageUrl = species.image_url;
  try {
    // We trigger this immediately as part of the import flow
    const dataUrl = await generateSpeciesImage(commonName, species.scientific_name);
    if (dataUrl) {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `import-${Date.now()}-${species.scientific_name.replace(/\s+/g, '-').toLowerCase()}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("species-images")
        .upload(fileName, buffer, { contentType: "image/png" });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("species-images").getPublicUrl(fileName);
        finalImageUrl = urlData.publicUrl;
        console.log(`[Import] Unique AI image generated and uploaded: ${finalImageUrl}`);
      } else {
        console.error(`[Import] Storage upload failed: ${uploadError.message}`);
      }
    } else {
      console.warn(`[Import] AI image generation returned null for ${commonName}`);
    }
  } catch (err) {
    console.warn("[Import] Instant image generation failed:", err);
  }

  const finalSpecies = {
    ...species,
    ...scrapedData,
    ...aiEnrichment,
    image_url: finalImageUrl,
    // Precedence: AI/Scraped > Original
    temp_min_c: scrapedData.temp_min_c ?? species.temp_min_c,
    temp_max_c: scrapedData.temp_max_c ?? species.temp_max_c,
    ph_min: scrapedData.ph_min ?? species.ph_min,
    ph_max: scrapedData.ph_max ?? species.ph_max,
    max_size_cm: scrapedData.max_size_cm ?? species.max_size_cm,
    notes: aiEnrichment.notes || scrapedData.notes || species.notes,
  };

  const { data, error } = await (supabase.from('species') as any)
    .upsert({
      common_name: commonName,
      scientific_name: finalSpecies.scientific_name,
      genus: finalSpecies.genus,
      species_epithet: finalSpecies.species_epithet,
      category: finalSpecies.category || 'fish',
      notes: finalSpecies.notes,
      swim_zone: finalSpecies.swim_zone,
      spec_code: finalSpecies.spec_code,
      temp_min_c: finalSpecies.temp_min_c,
      temp_max_c: finalSpecies.temp_max_c,
      ph_min: finalSpecies.ph_min,
      ph_max: finalSpecies.ph_max,
      max_size_cm: finalSpecies.max_size_cm,
      aggression_level: finalSpecies.aggression_level,
      care_difficulty: finalSpecies.care_difficulty,
      diet: finalSpecies.diet,
      image_url: finalSpecies.image_url,
    }, { onConflict: 'scientific_name' })
    .select()
    .single();

  if (error) {
    console.error(`[Import] Failed to save ${species.scientific_name}:`, error);
    throw error;
  }

  revalidatePath('/dashboard/species');
  return data;
}
