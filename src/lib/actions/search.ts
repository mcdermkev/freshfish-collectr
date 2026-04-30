"use server";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function semanticSearchInterceptor(query: string) {
  if (!query) return null;

  try {
    const { text } = await generateText({
      model: google("gemini-3-flash"), // Ultra-low latency model for 2026
      system: `You are a marine biologist and aquarium expert. 
      Analyze the search query for freshwater aquarium species.
      Extract specific attributes: category, aggression, difficulty, diet, and key features.
      Query: "${query}"
      
      Respond with ONLY a JSON object:
      {
        "category": "fish" | "plant" | "invertebrate" | null,
        "aggression_level": "peaceful" | "semi-aggressive" | "aggressive" | null,
        "care_difficulty": "easy" | "intermediate" | "advanced" | null,
        "diet": "herbivore" | "omnivore" | "carnivore" | null,
        "max_size_cm": number | null,
        "keywords": string[]
      }`,
      prompt: query,
    });

    const parsed = JSON.parse(text);
    const supabase = await createServerSupabaseClient();

    let dbQuery = (supabase.from("species") as any).select("*");

    if (parsed.category) dbQuery = dbQuery.eq("category", parsed.category);
    if (parsed.aggression_level) dbQuery = dbQuery.eq("aggression_level", parsed.aggression_level);
    if (parsed.care_difficulty) dbQuery = dbQuery.eq("care_difficulty", parsed.care_difficulty);
    if (parsed.diet) dbQuery = dbQuery.ilike("diet", `%${parsed.diet}%`);
    
    // Add keyword search for notes or names
    if (parsed.keywords && parsed.keywords.length > 0) {
      const orConditions = parsed.keywords.map((k: string) => `notes.ilike.%${k}%,common_name.ilike.%${k}%`).join(",");
      dbQuery = dbQuery.or(orConditions);
    }

    const { data, error } = await dbQuery.limit(10);

    if (error) throw error;

    return {
      summary: `Finding ${parsed.category || "species"} that are ${parsed.aggression_level || "any aggression"} and ${parsed.care_difficulty || "any"} care level.`,
      results: data || [],
      attributes: parsed
    };
  } catch (error) {
    console.error("[Search Interceptor Error]:", error);
    return null;
  }
}
