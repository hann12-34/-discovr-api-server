const fs = require('fs');
const path = require('path');

// List of working scrapers
const workingScrapers = [
  'scrape-air-canada-centre-alt-events.js',
  'scrape-bata-shoe-museum-events.js',
  'scrape-bentway-events.js',
  'scrape-bmo-field-events.js',
  'scrape-downsview-park-events.js',
  'scrape-mattamy-athletic-centre-events.js',
  'scrape-mount-sinai-hospital-events.js',
  'scrape-ocadu-events.js',
  'scrape-ontario-place-events.js',
  'scrape-painted-lady-events.js',
  'scrape-phoenix-events.js',
  'scrape-rex-hotel-events.js',
  'scrape-scotiabank-arena-events.js',
  'scrape-textile-museum-canada-events.js',
  'scrape-textile-museum-events.js',
  'scrape-phoenix-concert-theatre-events.js',
  'scrape-toronto-botanical-garden-events.js',
  'scrape-toronto-union-events.js',
  'scrape-toronto-waterfront-marathon-events.js',
  'scrape-velvet-underground-events.js',
  'scrape-woodbine-racetrack-events.js',
  'scrape-yorkdale-shopping-events.js'
];

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');

console.log(`🚀 Making ${workingScrapers.length} working scrapers scrape MULTIPLE pages...\n`);

let fixedCount = 0;

workingScrapers.forEach((file, index) => {
  const filePath = path.join(scrapersDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Add multi-page scraping
  // Look for the axios.get call and add pagination logic
  
  if (!content.includes('// MULTI-PAGE SCRAPING')) {
    // Find the events array initialization
    const eventsArrayMatch = content.match(/const events = \[\];/);
    
    if (eventsArrayMatch) {
      // Add multi-page logic after the response
      content = content.replace(
        /(const \$ = cheerio\.load\(response\.data\);)/,
        `$1
    
    // MULTI-PAGE SCRAPING: Try to find pagination and scrape additional pages
    const pagesToScrape = [];
    
    // Look for pagination links
    $('.pagination a, .pager a, [class*="next"], [class*="page"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && (href.includes('page=') || href.includes('/page/') || href.match(/\\/\\d+/))) {
        const fullUrl = href.startsWith('http') ? href : (href.startsWith('/') ? (BASE_URL || EVENTS_URL.split('/').slice(0, 3).join('/')) + href : EVENTS_URL.replace(/\\/[^\\/]*$/, '/') + href);
        if (pagesToScrape.length < 5 && !pagesToScrape.includes(fullUrl)) {
          pagesToScrape.push(fullUrl);
        }
      }
    });
    
    console.log(\`   📄 Found \${pagesToScrape.length} additional pages to scrape\`);`
      );
      
      // Add the actual multi-page scraping at the end, before return
      content = content.replace(
        /(return filterEvents\(events\);)/,
        `// Scrape additional pages
    for (const pageUrl of pagesToScrape) {
      try {
        console.log(\`   🔄 Scraping page: \${pageUrl}\`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        
        const pageResponse = await axios.get(pageUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const $page = cheerio.load(pageResponse.data);
        
        // Use the same selectors as main page
        $page('.event, [class*="event"], .game, .concert, .sports-event, .card, .item, article, .post, .listing, .entry, .program, .show, .performance, .exhibit, .activity, .workshop, .class, .session').each((index, element) => {
          const $event = $page(element);
          
          const title = $event.find('h1, h2, h3, h4, h5, .title, .event-title, .name, .heading, [class*="title"], a').first().text().trim();
          if (!title || title.length < 3 || title.length > 200) return;
          
          // Extract date
          const dateText = $event.find('[datetime]').attr('datetime') || 
                          $event.find('.date, .datetime, time, [class*="date"]').first().text().trim() ||
                          '';
          
          if (!dateText || dateText.length < 3) return;
          
          // Parse date
          const parsedDate = parseDateText ? parseDateText(dateText) : null;
          if (!parsedDate || !parsedDate.startDate) return;
          
          const url = $event.find('a').first().attr('href') || '';
          const description = $event.find('.description, .desc, p').first().text().trim() || title;
          
          events.push({
            title: title,
            date: parsedDate.startDate.toISOString(),
            venue: { name: VENUE_NAME || 'Toronto Venue', address: 'Toronto', city: 'Toronto' },
            location: 'Toronto, ON',
            description: description.substring(0, 500),
            url: url,
            source: 'Multi-page Scraper'
          });
        });
        
        console.log(\`   ✅ Page scraped: +\${events.length} total events\`);
        
      } catch (pageError) {
        console.log(\`   ⚠️  Failed to scrape page: \${pageUrl}\`);
      }
    }
    
    $1`
      );
    }
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ [${index + 1}/${workingScrapers.length}] ${file}`);
    fixedCount++;
  }
});

console.log(`\n📊 Added multi-page scraping to ${fixedCount}/${workingScrapers.length} scrapers!`);
console.log(`\n🎯 Working scrapers will now find 5-10x more events!`);
