import https from 'https';

async function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      rejectUnauthorized: false,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    };

    const req = https.get(url, options, (res) => {
      console.log(`[FishBase Service] ${url} -> Status: ${res.statusCode}`);
      
      if (res.statusCode === 301 || res.statusCode === 302) {
        console.log(`[FishBase Service] Redirect detected to: ${res.headers.location}`);
        return httpsGet(res.headers.location!).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', (err) => {
      console.error(`[FishBase Service] HTTPS Get Failed for ${url}:`, err.message);
      reject(err);
    });

    req.on('timeout', () => {
      console.error(`[FishBase Service] Timeout for ${url}`);
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

export async function getSpeciesDetails(specCode: number) {
  const url = `https://www.fishbase.se/summary/SpeciesSummary.php?ID=${specCode}`;
  try {
    const html = await httpsGet(url);
    
    const lengthMatch = html.match(/Max length\s*:\s*([\d.]+)\s*cm/i);
    const maxSize = lengthMatch ? parseFloat(lengthMatch[1]) : null;

    const tempMatch = html.match(/Temperature\s*:\s*(\d+)\s*-\s*(\d+)\s*°C/i);
    const tempMin = tempMatch ? parseInt(tempMatch[1]) : null;
    const tempMax = tempMatch ? parseInt(tempMatch[2]) : null;

    const phMatch = html.match(/pH\s*range\s*:\s*([\d.]+)\s*-\s*([\d.]+)/i);
    const phMin = phMatch ? parseFloat(phMatch[1]) : null;
    const phMax = phMatch ? parseFloat(phMatch[2]) : null;

    const biologyMatch = html.match(/Biology<\/b><br>([\s\S]+?)<\/td>/i);
    const biology = biologyMatch ? biologyMatch[1].replace(/<[^>]*>?/gm, '').trim() : null;

    return {
      max_size_cm: maxSize,
      temp_min_c: tempMin,
      temp_max_c: tempMax,
      ph_min: phMin,
      ph_max: phMax,
      notes: biology
    };
  } catch (e) {
    return {};
  }
}

async function fetchFromApi(searchTerm: string) {
  const url = `https://fishbase.ropensci.org/species?common_name=${encodeURIComponent(searchTerm)}`;
  try {
    const data = await httpsGet(url);
    const json = JSON.parse(data);
    return json.data || [];
  } catch (e) {
    return [];
  }
}

function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

async function fetchFromScraper(searchTerm: string) {
  const titleCaseSearch = toTitleCase(searchTerm);
  const urls = [
    `https://www.fishbase.se/comnames/CommonNameSearchList.php?CommonName=${encodeURIComponent(searchTerm)}&crit1_operator=CONTAINS`,
    `https://www.fishbase.se/comnames/CommonNameSearchList.php?CommonName=${encodeURIComponent(titleCaseSearch)}&crit1_operator=CONTAINS`,
    `https://www.fishbase.se/summary/SpeciesSummary.php?ID=&GenusSpecies=${encodeURIComponent(searchTerm).replace(/%20/g, '+')}`,
    `https://www.fishbase.org/comnames/CommonNameSearchList.php?CommonName=${encodeURIComponent(searchTerm)}&crit1_operator=CONTAINS`
  ];

  const uniqueUrls = [...new Set(urls)];

  for (const url of uniqueUrls) {
    try {
      console.log(`[FishBase Service] Scraping: ${url}`);
      const html = await httpsGet(url);
      console.log(`[FishBase Service] Received ${html.length} bytes`);

      // 1. Direct Summary Page Detection (Flexible)
      const isSummaryPage = /SpeciesSummary\.php/i.test(html) && (/Classification \/ Names/i.test(html) || /Max length/i.test(html) || /Environment/i.test(html));
      
      if (isSummaryPage) {
        console.log(`[FishBase Service] Detected DIRECT Summary Page match`);
        const idMatch = html.match(/ID=(\d+)/i);
        const sciNameMatch = html.match(/<title>([^,]+),\s*[^:]+:\s*aquarium<\/title>/i) ||
                            html.match(/<i>([A-Z][a-z]+ [a-z]+(\s[a-z]+)?)<\/i>/i) || 
                            html.match(/<h1[^>]*>([A-Z][a-z]+ [a-z]+(\s[a-z]+)?)/i);
        
        if (sciNameMatch) {
          const scientificName = sciNameMatch[1].trim();
          const specCode = idMatch ? parseInt(idMatch[1]) : 0;
          const parts = scientificName.split(' ');
          return [{
            spec_code: specCode,
            common_name: searchTerm,
            scientific_name: scientificName,
            genus: parts[0],
            species_epithet: parts.slice(1).join(' '),
            category: 'fish',
            notes: 'Direct match found in FishBase encyclopedia.',
            max_size_cm: 20
          }];
        }
      }

      // 2. Results List Pattern (Broadly matching both HTML and JS-encoded links)
      // We look for ID and the text immediately following it until a separator like < or \ or " or '
      const broadRegex = /SpeciesSummary\.php\?ID=(\d+)[^>]*>([^<\\\"']+)/gi;
      const matches = Array.from(html.matchAll(broadRegex));
      
      if (matches.length > 0) {
        console.log(`[FishBase Service] Found ${matches.length} broad matches`);
        const results = [];
        const seenIds = new Set();
        
        for (const match of matches) {
          const specCode = parseInt(match[1]);
          const name = match[2].trim();
          
          // Skip junk
          if (name.length < 3 || name.includes('Search') || name.includes('Back') || name.includes('Privacy')) continue;
          
          // [STRICT FILTER] Only include results that actually contain the search term in the name
          // This prevents sidebars/featured species (like the infamous "Red Devil") from hijacking results.
          const lowerName = name.toLowerCase();
          const lowerSearch = searchTerm.toLowerCase();
          if (!lowerName.includes(lowerSearch)) {
            // Check scientific name as well if possible (though broadRegex usually gets common names here)
            continue;
          }

          const existingIdx = results.findIndex(r => r.spec_code === specCode);
          const isSciName = /^[A-Z][a-z]+ [a-z]+/.test(name);

          if (existingIdx === -1) {
            const parts = name.split(/\s+/);
            results.push({
              spec_code: specCode,
              common_name: isSciName ? searchTerm : name,
              scientific_name: isSciName ? name : 'Loading...',
              genus: isSciName ? parts[0] : '',
              species_epithet: isSciName ? parts.slice(1).join(' ') : '',
              category: 'fish',
              notes: `Global ID: ${specCode}`,
              max_size_cm: 15
            });
          } else if (isSciName) {
            results[existingIdx].scientific_name = name;
            results[existingIdx].genus = parts[0];
            results[existingIdx].species_epithet = parts.slice(1).join(' ');
          }
          
          if (results.length >= 20) break;
        }
        
        if (results.length > 0) return results;
      }
    } catch (e) {
      console.error(`[FishBase Service] Scraper error:`, e);
    }
  }
  return [];
}

export async function scrapeFishBase(searchTerm: string) {
  console.log(`[FishBase Service] Multi-source search for: "${searchTerm}"`);
  const scraperResults = await fetchFromScraper(searchTerm);
  if (scraperResults.length > 0) return scraperResults;
  
  const apiResults = await fetchFromApi(searchTerm);
  return apiResults.map((fish: any) => ({
    spec_code: fish.SpecCode,
    common_name: fish.FBname || fish.ComName || searchTerm,
    scientific_name: `${fish.Genus} ${fish.Species}`,
    genus: fish.Genus,
    species_epithet: fish.Species,
    category: 'fish',
    notes: fish.Biology || fish.Comments,
    temp_min_c: fish.TempMin,
    temp_max_c: fish.TempMax,
    ph_min: fish.PHMin,
    ph_max: fish.PHMax,
    max_size_cm: fish.Length,
  }));
}
