const https = require('https');

async function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const options = {
      rejectUnauthorized: false,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    };

    https.get(url, options, (res) => {
      console.log(`Status: ${res.statusCode} for ${url}`);
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function test() {
  const searchTerm = 'Red Devil';
  const url = `https://www.fishbase.se/comnames/CommonNameSearchList.php?CommonName=${encodeURIComponent(searchTerm)}&crit1_operator=CONTAINS`;
  
  try {
    const html = await httpsGet(url);
    const fs = require('fs');
    fs.writeFileSync('scratch/output.html', html);
    console.log(`Length: ${html.length}`);
    
    // Check if it's a summary page
    const isSummaryPage = /SpeciesSummary\.php/i.test(html) && (/Classification \/ Names/i.test(html) || /Max length/i.test(html));
    console.log(`Is Summary Page: ${isSummaryPage}`);

    const idMatch = html.match(/ID=(\d+)/i);
    console.log(`ID Match: ${idMatch ? idMatch[1] : 'None'}`);

    const sciNameMatch = html.match(/<title>([^,]+),\s*[^:]+:\s*aquarium<\/title>/i) ||
                        html.match(/<i>([A-Z][a-z]+ [a-z]+(\s[a-z]+)?)<\/i>/i) || 
                        html.match(/<h1[^>]*>([A-Z][a-z]+ [a-z]+(\s[a-z]+)?)/i);
    console.log(`Sci Name Match: ${sciNameMatch ? sciNameMatch[1] : 'None'}`);

    // Find all IDs
    const allIdsRegex = /SpeciesSummary\.php\?ID=(\d+)/gi;
    const idMatches = Array.from(html.matchAll(allIdsRegex));
    console.log(`Total ID occurrences: ${idMatches.length}`);
    idMatches.forEach((m, i) => {
       const start = m.index;
       const context = html.substring(start, start + 200);
       console.log(`Context ${i}: ${context}`);
    });

  } catch (e) {
    console.error('Test failed:', e);
  }
}

test();
