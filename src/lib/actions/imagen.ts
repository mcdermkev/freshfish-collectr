"use server";

import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';

// Standard Google Cloud Project configuration
const projectId = process.env.GOOGLE_CLOUD_PROJECT || "freshfish-collectr";
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const modelId = "imagen-4.0-generate-001";

const client = new PredictionServiceClient({
  apiEndpoint: `${location}-aiplatform.googleapis.com`,
});

export async function generateSpeciesImage(speciesName: string) {
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${modelId}`;

  const prompt = `Photorealistic macro photography of ${speciesName} fish, aquarium lighting, 8k resolution.`;

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
    // Avoid destructuring to bypass TS iterator error on grpc promise
    const result = await client.predict(request);
    const response = result[0];
    
    if (!response || !response.predictions || response.predictions.length === 0) {
      throw new Error("No predictions returned from Imagen 4");
    }

    // Vertex AI returns images as base64 strings in the 'bytesBase64Encoded' field
    const prediction: any = helpers.fromValue(response.predictions[0] as any);
    const base64Image = prediction.bytesBase64Encoded;

    if (!base64Image) {
      throw new Error("Image data missing in prediction");
    }

    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error("[Imagen 4 Error]:", error);
    // Return null to trigger placeholder fallback
    return null;
  }
}
