const fs = require('fs');
const path = require('path');
const axios = require('axios');

(async () => {
  console.log('🔍 COMPREHENSIVE CALGARY SCRAPER AUDIT\n');
  console.log('═══════════════════════════════════════════\n');
  
  const calgaryDir = './scrapers/cities/Calgary';
  const files = fs.readdirSync(calgaryDir)
    .filter(f => f.endsWith('.js') && 
                 f !== 'index.js' && 
                 !f.includes('test') && 
                 !f.includes('backup') &&
                 !f.includes('template'))
    .sort();
  
  console.log('Total scrapers to check:', files.length);
  console.log('');
  
  const results = {
    working: [],
    urlError: [],
    jsRendered: [],
    codeError: [],
    blacklisted: [],
    duplicates: []
  };
  
  const blacklist = [
    'blogto.com', 'narcity.com', 'timeout.com', 
    'cbc.ca', 'globalnews.ca', 'citynews.ca', 'cp24.com', 'dailyhive.com',
    'eventbrite.com', 'ticketmaster.com', 'ticketweb.com',
    'instagram.com', 'facebook.com', 'twitter.com', 'tiktok.com',
    'songkick.com', 'bandsintown.com', 'ra.co', 'dice.fm',
    'meetup.com', 'eventful.com'
  ];
  
  // Track URLs to find duplicates
  const urlToFiles = {};
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(calgaryDir, file), 'utf8');
      const urlMatch = content.match(/https?:\/\/[^'"\s]+/);
      
      if (!urlMatch) {
        results.codeError.push({ file, error: 'No URL found in file' });
        continue;
      }
      
      const url = urlMatch[0];
      
      // Track for duplicates
      if (urlToFiles[url]) {
        urlToFiles[url].push(file);
        results.duplicates.push({ url, files: urlToFiles[url] });
      } else {
        urlToFiles[url] = [file];
      }
      
      // Check if blacklisted
      if (blacklist.some(domain => url.includes(domain))) {
        results.blacklisted.push({ file, url, reason: 'News/aggregator site' });
        continue;
      }
      
      // Try to load URL
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 8000,
          maxRedirects: 5
        });
        
        if (response.status === 200) {
          const bodyLength = response.data.length;
          
          if (bodyLength < 5000) {
            results.jsRendered.push({ file, url, size: bodyLength });
            continue;
          }
          
          // Test the scraper
          try {
            delete require.cache[require.resolve(path.join(process.cwd(), calgaryDir, file))];
            const scraper = require(path.join(process.cwd(), calgaryDir, file));
            const events = await scraper('Calgary');
            
            if (events && events.length > 0) {
              results.working.push({ file, url, count: events.length });
            } else {
              results.jsRendered.push({ file, url, size: bodyLength });
            }
          } catch (err) {
            results.codeError.push({ file, url, error: err.message.substring(0, 80) });
          }
        }
      } catch (err) {
        if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
          results.urlError.push({ file, url, error: 'Domain not found' });
        } else if (err.response && (err.response.status === 404 || err.response.status === 403)) {
          results.urlError.push({ file, url, error: err.response.status + ' error' });
        } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
          results.urlError.push({ file, url, error: 'Timeout' });
        } else {
          results.codeError.push({ file, url, error: err.message.substring(0, 80) });
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      results.codeError.push({ file, error: err.message.substring(0, 80) });
    }
  }
  
  // Find actual duplicates (same URL used by multiple files)
  const actualDuplicates = Object.entries(urlToFiles).filter(([url, files]) => files.length > 1);
  
  console.log('\n\n📊 AUDIT RESULTS:');
  console.log('═══════════════════════════════════════════');
  console.log('✅ Working:', results.working.length);
  console.log('🚫 Blacklisted:', results.blacklisted.length);
  console.log('💻 JS-Rendered:', results.jsRendered.length);
  console.log('🔗 URL Errors:', results.urlError.length);
  console.log('⚠️  Code Errors:', results.codeError.length);
  console.log('🔄 Duplicate scrapers:', actualDuplicates.length);
  console.log('');
  
  if (actualDuplicates.length > 0) {
    console.log('🔄 DUPLICATE SCRAPERS (same URL):');
    actualDuplicates.forEach(([url, files]) => {
      console.log('\n   URL:', url);
      console.log('   Files:');
      files.forEach(f => console.log('     -', f));
    });
    console.log('');
  }
  
  if (results.working.length > 0) {
    console.log('✅ WORKING SCRAPERS:');
    results.working.forEach(s => {
      console.log('  ✅', s.file, '→', s.count, 'events');
    });
    console.log('');
  }
  
  if (results.urlError.length > 0) {
    console.log('\n🔗 URL ERRORS (need fixes):');
    results.urlError.slice(0, 10).forEach(s => {
      console.log('  ❌', s.file);
      console.log('     URL:', s.url);
      console.log('     Error:', s.error);
    });
    if (results.urlError.length > 10) {
      console.log('  ... and', results.urlError.length - 10, 'more');
    }
  }
  
  console.log('\n📝 Summary:');
  console.log('   Can\'t fix:', (results.jsRendered.length + results.blacklisted.length));
  console.log('   Can fix:', (results.urlError.length + results.codeError.length));
  console.log('   Remove duplicates:', actualDuplicates.length);
  console.log('   Already working:', results.working.length);
  
  fs.writeFileSync('calgary_scraper_audit.json', JSON.stringify({...results, actualDuplicates}, null, 2));
  console.log('\n✅ Report saved to: calgary_scraper_audit.json');
})();
