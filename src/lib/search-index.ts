import { 
  Document, 
  VectorStoreIndex, 
  Settings 
} from "llamaindex";
import { Gemini, GeminiEmbedding, GEMINI_MODEL, GEMINI_EMBEDDING_MODEL } from "@llamaindex/google";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Configure LlamaIndex to use Gemini 3
// We use type casting to GEMINI_MODEL as the library might not have the 2026 models in its enum yet
Settings.llm = new Gemini({
  model: "gemini-3-flash" as GEMINI_MODEL,
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

Settings.embedModel = new GeminiEmbedding({
  model: "text-embedding-3" as GEMINI_EMBEDDING_MODEL, // Using Gemini 3 series embedding model
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function getSpeciesIndex() {
  const supabase = await createServerSupabaseClient();
  const { data: species, error } = await (supabase.from("species") as any).select("*");

  if (error || !species) {
    console.error("[LlamaIndex] Failed to fetch species for indexing:", error);
    return null;
  }

  const documents = species.map((s: any) => {
    return new Document({
      text: `Common Name: ${s.common_name}\nScientific Name: ${s.scientific_name}\nCategory: ${s.category}\nDiet: ${s.diet}\nAggression: ${s.aggression_level}\nCare: ${s.care_difficulty}\nNotes: ${s.notes}`,
      metadata: { id: s.id, name: s.common_name }
    });
  });

  try {
    const index = await VectorStoreIndex.fromDocuments(documents);
    return index;
  } catch (err) {
    console.error("[LlamaIndex] Index creation failed:", err);
    return null;
  }
}

export async function semanticSearch(query: string) {
  const index = await getSpeciesIndex();
  if (!index) return [];

  try {
    const queryEngine = index.asQueryEngine();
    const response = await queryEngine.query({ query });
    return response.toString();
  } catch (err) {
    console.error("[LlamaIndex] Semantic search failed:", err);
    return [];
  }
}
