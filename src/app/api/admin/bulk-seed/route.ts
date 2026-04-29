import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { seedLocalSpecies } from "@/lib/seed-species";

/**
 * POST /api/admin/bulk-seed
 * 
 * Admin-only route to bulk seed species data.
 * Expects a JSON body: { species: SeedSpeciesInput[] }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 1. Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check Admin Status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!(profile as any)?.is_admin) {
      return NextResponse.json({ error: "Access denied: Admins only" }, { status: 403 });
    }

    // 3. Parse and Validate Body
    const body = await request.json();
    const speciesList = body.species;

    if (!speciesList || !Array.isArray(speciesList)) {
      return NextResponse.json({ error: "Invalid species list. Expected an array." }, { status: 400 });
    }

    // 4. Trigger Seeding
    console.log(`Admin ${user.email} triggering bulk seed of ${speciesList.length} species.`);
    
    // Clean and Map Data
    const cleanedList = speciesList.map(s => ({
      common_name: s.common_name,
      scientific_name: s.scientific_name || null,
      category: s.category || 'fish',
      max_size_cm: s.max_size_cm || null,
      min_tank_gallons: s.min_tank_gallons || null,
      temp_min_c: s.temp_min_c || null,
      temp_max_c: s.temp_max_c || null,
      ph_min: s.ph_min || null,
      ph_max: s.ph_max || null,
      aggression_level: s.aggression_level || 'peaceful',
      care_difficulty: s.care_difficulty || 'easy',
      swim_zone: s.swim_zone || null,
      diet: s.diet || null,
      notes: s.notes || null,
      image_url: s.image_url || null,
      fishbase_url: s.fishbase_url || null,
    }));

    const results = await seedLocalSpecies(cleanedList);

    return NextResponse.json({
      success: true,
      count: results?.length || 0,
      message: `Successfully seeded ${results?.length} species into the local database.`
    });

  } catch (error: any) {
    console.error("Bulk Seed Error:", error);
    return NextResponse.json({ 
      error: error.message || "Bulk seed failed", 
      details: error.toString() 
    }, { status: 400 });
  }
}
