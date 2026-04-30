const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupAndSync() {
  console.log("🚀 Starting cleanup of stock images...");

  // 1. Clear all image_urls that don't belong to our Supabase Storage
  // We'll target everything that is not NULL and doesn't contain our project ref
  const { data, error } = await supabase
    .from('species')
    .update({ image_url: null })
    .not('image_url', 'is', null)
    .not('image_url', 'ilike', '%supabase.co/storage/v1/object/public/species-images%');

  if (error) {
    console.error("❌ Cleanup failed:", error);
    return;
  }

  console.log("✅ Cleanup complete. All external stock images removed.");
  console.log("⏳ You can now trigger the 'Sync All Missing Images' button from the Admin Dashboard to generate new photorealistic Imagen 4.0 visuals.");
}

cleanupAndSync();
