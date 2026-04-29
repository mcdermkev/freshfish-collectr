/**
 * FishBase API Client
 * Public API: https://fishbase.ropensci.org
 * No auth required. Be polite: use batches + delays.
 */

const FISHBASE_BASE = "https://fishbase.ropensci.org";

/** Delay helper for rate limiting */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Raw FishBase response types
// ---------------------------------------------------------------------------

export interface FishBaseSpecies {
  SpecCode: number;
  Genus: string;
  Species: string;
  FBname: string | null;
  Length: number | null;      // max total length in cm
  TempMin: number | null;     // °C
  TempMax: number | null;     // °C
  pHMin: number | null;
  pHMax: number | null;
  Fresh: number | null;       // 1 = freshwater
  Saltwater: number | null;
  Brack: number | null;
}

export interface FishBaseCommonName {
  SpecCode: number;
  ComName: string;
  Language: string;
  Rank: number | null;        // lower = more common
}

export interface FishBaseEcology {
  SpecCode: number;
  DemersPelag: string | null;
}

// ---------------------------------------------------------------------------
// Transformed record ready for Supabase upsert
// ---------------------------------------------------------------------------

export interface SpeciesUpsertRecord {
  spec_code: number;
  scientific_name: string;
  genus: string;
  species_epithet: string;
  common_name: string;
  category: "fish";
  max_size_cm: number | null;
  temp_min_c: number | null;
  temp_max_c: number | null;
  ph_min: number | null;
  ph_max: number | null;
  swim_zone: "top" | "middle" | "bottom" | "all" | null;
  fishbase_url: string;
  notes: string | null;
  // Columns we don't set from FishBase (left for manual editing)
  aggression_level: null;
  care_difficulty: null;
  min_tank_gallons: null;
}

// ---------------------------------------------------------------------------
// DemersPelag → swim_zone mapping
// ---------------------------------------------------------------------------

function mapSwimZone(
  demersPelag: string | null
): "top" | "middle" | "bottom" | "all" | null {
  if (!demersPelag) return null;
  const d = demersPelag.toLowerCase();
  if (d.includes("pelagic-oceanic")) return "top";
  if (d.includes("pelagic-neritic") || d.includes("benthopelagic")) return "middle";
  if (d.includes("demersal") || d.includes("bathydemersal")) return "bottom";
  if (d === "pelagic") return "top";
  return "all";
}

// ---------------------------------------------------------------------------
// API fetch helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a page of species from FishBase.
 * Only freshwater species (Fresh=1) are relevant for aquarium use.
 */
export async function fetchFishBaseSpeciesPage(
  offset: number,
  limit: number = 50
): Promise<{ data: FishBaseSpecies[]; hasMore: boolean }> {
  const fields = [
    "SpecCode",
    "Genus",
    "Species",
    "FBname",
    "Length",
    "TempMin",
    "TempMax",
    "pHMin",
    "pHMax",
    "Fresh",
    "Saltwater",
    "Brack",
  ].join(",");

  const url = `${FISHBASE_BASE}/species?limit=${limit}&offset=${offset}&fields=${fields}&Fresh=1`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return { data: [], hasMore: false };

    const json = await res.json();
    const data: FishBaseSpecies[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : [];

    return { data, hasMore: data.length === limit };
  } catch (error) {
    console.error("FishBase /species fetch error:", error);
    return { data: [], hasMore: false };
  }
}

/**
 * Fetch the primary English common name for a given SpecCode.
 * Returns null if none found.
 */
export async function fetchCommonName(
  specCode: number
): Promise<string | null> {
  try {
    const url = `${FISHBASE_BASE}/comnames?SpecCode=${specCode}&Language=English&limit=5`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = await res.json();
    const names: FishBaseCommonName[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : [];

    if (names.length === 0) return null;

    // Prefer rank 1 (primary), otherwise first result
    const primary = names.find((n) => n.Rank === 1) ?? names[0];
    return primary.ComName ?? null;
  } catch (error) {
    console.error(`FishBase /comnames fetch error for ${specCode}:`, error);
    return null;
  }
}

/**
 * Fetch ecology data for swim zone.
 * Returns null if not available.
 */
export async function fetchEcology(
  specCode: number
): Promise<FishBaseEcology | null> {
  try {
    const url = `${FISHBASE_BASE}/ecology?SpecCode=${specCode}&fields=SpecCode,DemersPelag&limit=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = await res.json();
    const rows: FishBaseEcology[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : [];

    return rows[0] ?? null;
  } catch (error) {
    console.error(`FishBase /ecology fetch error for ${specCode}:`, error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main transformer: FishBase species → our DB record
// ---------------------------------------------------------------------------

export function transformSpecies(
  raw: FishBaseSpecies,
  commonName: string | null,
  ecology: FishBaseEcology | null
): SpeciesUpsertRecord {
  const scientificName = `${raw.Genus} ${raw.Species}`.trim();
  const displayName =
    commonName ?? raw.FBname ?? scientificName;

  return {
    spec_code: raw.SpecCode,
    scientific_name: scientificName,
    genus: raw.Genus,
    species_epithet: raw.Species,
    common_name: displayName,
    category: "fish",
    max_size_cm: raw.Length ?? null,
    temp_min_c: raw.TempMin ?? null,
    temp_max_c: raw.TempMax ?? null,
    ph_min: raw.pHMin ?? null,
    ph_max: raw.pHMax ?? null,
    swim_zone: mapSwimZone(ecology?.DemersPelag ?? null),
    fishbase_url: `https://fishbase.se/summary/${raw.Genus}-${raw.Species}.html`,
    notes: null,
    aggression_level: null,
    care_difficulty: null,
    min_tank_gallons: null,
  };
}

/**
 * Process a batch of raw species records:
 * fetch common names + ecology for each, then transform.
 * Includes a small delay between individual fetches.
 */
export async function processBatch(
  rawSpecies: FishBaseSpecies[],
  delayMs: number = 150
): Promise<SpeciesUpsertRecord[]> {
  const results: SpeciesUpsertRecord[] = [];

  for (const raw of rawSpecies) {
    const [commonName, ecology] = await Promise.all([
      fetchCommonName(raw.SpecCode),
      fetchEcology(raw.SpecCode),
    ]);
    results.push(transformSpecies(raw, commonName, ecology));
    await delay(delayMs);
  }

  return results;
}

/**
 * Search FishBase by query (common name or scientific name).
 */
export async function searchFishBase(query: string): Promise<SpeciesUpsertRecord[]> {
  try {
    // 1. Try to find by common name
    const comUrl = `${FISHBASE_BASE}/comnames?ComName=${encodeURIComponent(query)}&Language=English&limit=5`;
    const comRes = await fetch(comUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
    let specCodes: number[] = [];
    
    if (comRes.ok) {
      const json = await comRes.json();
      const data = Array.isArray(json) ? json : json.data || [];
      specCodes = data.map((n: any) => n.SpecCode);
    }

    // 2. Also try to find by scientific name (Genus + Species)
    // We'll split the query and try to use it as Genus/Species
    const parts = query.split(" ");
    if (parts.length >= 2) {
      const genus = parts[0];
      const species = parts[1];
      const spUrl = `${FISHBASE_BASE}/species?Genus=${encodeURIComponent(genus)}&Species=${encodeURIComponent(species)}&limit=5`;
      const spRes = await fetch(spUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (spRes.ok) {
        const json = await spRes.json();
        const data = Array.isArray(json) ? json : json.data || [];
        data.forEach((s: any) => {
          if (!specCodes.includes(s.SpecCode)) specCodes.push(s.SpecCode);
        });
      }
    }

    if (specCodes.length === 0) return [];

    // 3. Fetch full details for these SpecCodes
    const results: SpeciesUpsertRecord[] = [];
    for (const code of specCodes.slice(0, 5)) {
      const spUrl = `${FISHBASE_BASE}/species/${code}`;
      const spRes = await fetch(spUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (spRes.ok) {
        const json = await spRes.json();
        const raw = Array.isArray(json) ? json[0] : json.data?.[0] || json;
        if (raw && raw.Fresh === 1) {
          const [commonName, ecology] = await Promise.all([
            fetchCommonName(raw.SpecCode),
            fetchEcology(raw.SpecCode),
          ]);
          results.push(transformSpecies(raw, commonName, ecology));
        }
      }
      await delay(100);
    }

    return results;
  } catch (error) {
    console.error("searchFishBase failed:", error);
    return [];
  }
}
