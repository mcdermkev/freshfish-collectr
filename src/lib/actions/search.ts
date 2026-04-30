"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function semanticSearchInterceptor(query: string) {
  if (!query) return null;

  try {
    const supabase = await createServerSupabaseClient();
    
    // Simple direct search against local database
    const { data, error } = await (supabase.from("species") as any)
      .select("*")
      .or(`common_name.ilike.%${query}%,scientific_name.ilike.%${query}%,notes.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;

    return {
      summary: `Searching for "${query}" in local database...`,
      results: data || [],
      attributes: { keywords: [query] }
    };
  } catch (error) {
    console.error("[Search Interceptor Error]:", error);
    return null;
  }
}
