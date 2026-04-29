const https = require('https');

async function test() {
  const search = 'Bitterling';
  const url = `https://www.fishbase.se/comnames/CommonNameSearchList.php?CommonName=${search}`;
  const options = { headers: { 'User-Agent': 'Mozilla/5.0' } };
  
  https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      // Find all scientific names in checkboxes
      const matches = data.match(/value='([A-Z][a-z]+ [a-z]+)'/g) || [];
      console.log("Scientific names in checkboxes:", matches);
      
      // Find any links with summary
      const links = data.match(/href="[^"]*summary[^"]*"/gi) || [];
      console.log("Summary links:", links);
    });
  });
}

test();
