"use server";

export async function generateSpeciesImage(speciesName: string) {
  const apiKey = process.env.PIXAZO_API_KEY;
  
  if (!apiKey) {
    console.warn("[Pixazo] API Key missing. Falling back to placeholder logic.");
    return null;
  }

  const prompt = `High-resolution professional macro photography of ${speciesName} freshwater fish, aquarium lighting, 8k.`;

  try {
    const response = await fetch("https://api.pixazo.ai/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "flux-schnell",
        prompt: prompt,
        width: 1024,
        height: 576, // Aspect ratio matching aspect-video
        steps: 4,    // Schnell is fast
      }),
    });

    if (!response.ok) {
      throw new Error(`Pixazo API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url || data.image_url || null;
  } catch (error) {
    console.error("[Pixazo Error]:", error);
    return null;
  }
}
