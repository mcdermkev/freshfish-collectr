const { createClient } = require('@supabase/supabase-js');
const { PredictionServiceClient, helpers } = require('@google-cloud/aiplatform');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = process.env.GOOGLE_CLOUD_PROJECT || "getnexusaisolutions";
const location = "us-central1";
const modelId = "imagen-4.0-generate-001";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const client = new PredictionServiceClient({
  apiEndpoint: `${location}-aiplatform.googleapis.com`,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSync() {
  console.log("🌊 Starting Vertex AI Imagen 4.0 Sync...");
  
  const { data: species, error } = await supabase
    .from('species')
    .select('*')
    .is('image_url', null);

  if (error) {
    console.error("❌ Failed to fetch species:", error);
    return;
  }

  console.log(`🔍 Found ${species.length} species needing new images.`);

  let success = 0;
  let failed = 0;

  for (const s of species) {
    console.log(`\n📸 Generating for: ${s.common_name} (${s.scientific_name})...`);
    
    try {
      const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${modelId}`;
      const prompt = `Ultra-high definition macro photography of a ${s.common_name} (${s.scientific_name}) in a natural freshwater aquarium, professional lighting, 8k.`;

      const instance = helpers.toValue({ prompt });
      const parameter = helpers.toValue({ sampleCount: 1, aspectRatio: "16:9" });

      const request = { endpoint, instances: [instance], parameters: parameter };

      // Generate
      const [response] = await client.predict(request);
      const prediction = helpers.fromValue(response.predictions[0]);
      const base64Image = prediction.bytesBase64Encoded;

      if (!base64Image) throw new Error("No image data returned.");

      // Upload
      const buffer = Buffer.from(base64Image, "base64");
      const fileName = `${s.id}-${Date.now()}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('species-images')
        .upload(fileName, buffer, { contentType: "image/png", upsert: true });

      if (uploadError) throw uploadError;

      // Update DB
      const { data: urlData } = supabase.storage
        .from('species-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('species')
        .update({ image_url: urlData.publicUrl })
        .eq('id', s.id);

      if (updateError) throw updateError;

      console.log(`✅ Success! Image live at: ${urlData.publicUrl}`);
      success++;
    } catch (err) {
      console.error(`❌ Failed ${s.common_name}:`, err.message);
      failed++;
    }

    console.log("⏳ Throttling: 3s delay...");
    await sleep(3000);
  }

  console.log(`\n🎉 Sync Complete!`);
  console.log(`📊 Stats: ${success} Succeeded, ${failed} Failed.`);
}

runSync();
