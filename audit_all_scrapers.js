const fs = require('fs');
const path = require('path');
const axios = require('axios');

(async () => {
  console.log('🔍 COMPREHENSIVE TORONTO SCRAPER AUDIT\n');
  console.log('═══════════════════════════════════════════\n');
  
  const torontoDir = './scrapers/cities/Toronto';
  const files = fs.readdirSync(torontoDir)
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
    blacklisted: []
  };
  
  const blacklist = [
    'blogto.com', 'narcity.com', 'timeout.com', 'torontostar.com',
    'nowtoronto.com', 'thestar.com', 'cbc.ca', 'globalnews.ca',
    'citynews.ca', 'cp24.com', 'dailyhive.com',
    'eventbrite.com', 'ticketmaster.com', 'ticketweb.com',
    'instagram.com', 'facebook.com', 'twitter.com', 'tiktok.com',
    'songkick.com', 'bandsintown.com', 'ra.co', 'dice.fm',
    'meetup.com', 'eventful.com'
  ];
  
  let count = 0;
  
  for (const file of files) {
    count++;
    
    if (count % 20 === 0) {
      console.log(`Progress: ${count}/${files.length}...`);
    }
    
    try {
      // Read file to get URL
      const content = fs.readFileSync(path.join(torontoDir, file), 'utf8');
      const urlMatch = content.match(/https?:\/\/[^'"\s]+/);
      
      if (!urlMatch) {
        results.codeError.push({ file, error: 'No URL found in file' });
        continue;
      }
      
      const url = urlMatch[0];
      
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
          
          // Check if JS-rendered (very small HTML)
          if (bodyLength < 5000) {
            results.jsRendered.push({ file, url, size: bodyLength });
            continue;
          }
          
          // URL works, test the scraper
          try {
            delete require.cache[require.resolve(path.join(process.cwd(), torontoDir, file))];
            const scraper = require(path.join(process.cwd(), torontoDir, file));
            const events = await scraper('Toronto');
            
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
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      results.codeError.push({ file, error: err.message.substring(0, 80) });
    }
  }
  
  console.log('\n\n📊 AUDIT RESULTS:');
  console.log('═══════════════════════════════════════════');
  console.log('✅ Working:', results.working.length);
  console.log('🚫 Blacklisted (news/aggregators):', results.blacklisted.length);
  console.log('💻 JS-Rendered (React/Next.js):', results.jsRendered.length);
  console.log('🔗 URL Errors (404/403/timeout):', results.urlError.length);
  console.log('⚠️  Code Errors:', results.codeError.length);
  console.log('');
  
  // Show fixable issues
  console.log('\n🔧 FIXABLE ISSUES:\n');
  
  if (results.urlError.length > 0) {
    console.log('1. URL Errors (404/403/Dead Links) - ' + results.urlError.length + ' scrapers');
    console.log('   These need new/updated URLs:\n');
    results.urlError.slice(0, 15).forEach(s => {
      const name = s.file.replace('scrape-', '').replace('-events.js', '').replace(/-/g, ' ');
      console.log('   ❌', name);
      console.log('      File:', s.file);
      console.log('      Bad URL:', s.url);
      console.log('      Error:', s.error);
      console.log('');
    });
    if (results.urlError.length > 15) {
      console.log('   ... and', results.urlError.length - 15, 'more\n');
    }
  }
  
  if (results.codeError.length > 0) {
    console.log('\n2. Code Errors - ' + results.codeError.length + ' scrapers');
    console.log('   These have implementation bugs:\n');
    results.codeError.slice(0, 10).forEach(s => {
      console.log('   ⚠️ ', s.file);
      console.log('      Error:', s.error);
      console.log('');
    });
    if (results.codeError.length > 10) {
      console.log('   ... and', results.codeError.length - 10, 'more\n');
    }
  }
  
  console.log('\n📝 Summary:');
  console.log('   Can\'t fix: ' + (results.jsRendered.length + results.blacklisted.length) + ' (JS-rendered or blacklisted)');
  console.log('   Can fix: ' + (results.urlError.length + results.codeError.length) + ' (URL updates or code fixes)');
  console.log('   Already working: ' + results.working.length);
  
  // Save detailed report
  fs.writeFileSync('toronto_scraper_audit.json', JSON.stringify(results, null, 2));
  console.log('\n✅ Detailed report saved to: toronto_scraper_audit.json');
})();
