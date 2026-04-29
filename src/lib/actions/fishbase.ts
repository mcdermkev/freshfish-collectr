'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

import { scrapeFishBase, getSpeciesDetails } from '@/lib/services/fishbase';

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
  
  console.log(`[Import] Enriching data for: ${species.scientific_name}`);
  
  let enrichedData: any = {};
  if (species.spec_code) {
    try {
      enrichedData = await getSpeciesDetails(species.spec_code);
    } catch (e) {
      console.warn(`[Import] Detail enrichment failed for ${species.scientific_name}`, e);
    }
  }

  const finalSpecies = {
    ...species,
    ...enrichedData,
    // Ensure we don't overwrite with nulls if we already had data
    temp_min_c: enrichedData.temp_min_c ?? species.temp_min_c,
    temp_max_c: enrichedData.temp_max_c ?? species.temp_max_c,
    ph_min: enrichedData.ph_min ?? species.ph_min,
    ph_max: enrichedData.ph_max ?? species.ph_max,
    max_size_cm: enrichedData.max_size_cm ?? species.max_size_cm,
    notes: enrichedData.notes ?? species.notes,
  };

  const { data, error } = await (supabase.from('species') as any)
    .upsert({
      common_name: finalSpecies.common_name || `${finalSpecies.genus} ${finalSpecies.species_epithet}`,
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
    }, { onConflict: 'scientific_name' }) // Use scientific name for conflict to avoid duplicates
    .select()
    .single();

  if (error) {
    console.error(`[Import] Failed to save ${species.scientific_name}:`, error);
    throw error;
  }

  revalidatePath('/dashboard/species');
  return data;
}
