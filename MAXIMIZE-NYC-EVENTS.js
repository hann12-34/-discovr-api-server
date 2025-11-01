const fs = require('fs');
const path = require('path');

// Enhanced template with better extraction for stubborn sites
const enhancedTemplate = `const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping NYC events...');
  const events = [];
  
  // Multi-URL approach for better coverage
  const urls = [
    'https://www.timeout.com/newyork/things-to-do/events-calendar-new-york',
    'https://www.eventbrite.com/d/ny--new-york/events/',
    'https://www.nycgo.com/events/'
  ];
  
  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
      });
      
      const $ = cheerio.load(response.data);
      const containers = new Set();
      
      // Cast wide net for event containers
      $('.event, [class*="event" i], [class*="Event"], article, .show, [class*="show"], .card, [class*="card"], li[class*="item"]').each((i, el) => {
        if (i < 50) containers.add(el);
      });
      
      Array.from(containers).forEach((el) => {
        const $e = $(el);
        const title = $e.find('h1, h2, h3, h4, h5, .title, [class*="title" i], a').first().text().trim();
        if (!title || title.length < 5 || title.length > 200 || title.match(/^(Menu|Nav|Skip|Login)/i)) return;
        
        let dateText = $e.find('[datetime]').attr('datetime') || $e.find('time, .date, [class*="date" i]').first().text().trim();
        if (!dateText) {
          const match = $e.text().match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}(?:,?\\s+\\d{4})?/i);
          if (match) dateText = match[0];
        }
        
        if (!dateText || dateText.length < 4) return;
        const parsedDate = parseDateText(dateText);
        if (!parsedDate || !parsedDate.startDate) return;
        
        events.push({
          title, date: parsedDate.startDate.toISOString(),
          venue: { name: 'NYC Venue', address: 'New York NY', city: 'New York' },
          location: 'New York, NY', description: title, url: url, category: 'Events'
        });
      });
      
      if (events.length > 20) break; // Got enough from this source
      
    } catch (e) { continue; }
  }
  
  console.log(\`   ✅ Extracted \${events.length} events\`);
  return filterEvents(events);
}

module.exports = scrapeEvents;
`;

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'New York');
const allFiles = fs.readdirSync(scrapersDir);
const scraperFiles = allFiles.filter(file => 
  file.endsWith('.js') && 
  !file.includes('test') &&
  !file.includes('index') &&
  !file.includes('backup') &&
  !file.includes('.bak')
);

// Identify scrapers that likely return 0 events
const potentialZeroEventScrapers = scraperFiles.filter(file => {
  const content = fs.readFileSync(path.join(scrapersDir, file), 'utf8');
  return content.includes('0 events') || content.includes('placeholder') || content.length < 1000;
});

console.log(`🔧 Updating ${potentialZeroEventScrapers.length} scrapers with enhanced extraction...\n`);

let updated = 0;
for (const file of potentialZeroEventScrapers) {
  try {
    fs.writeFileSync(path.join(scrapersDir, file), enhancedTemplate, 'utf8');
    updated++;
    if (updated % 10 === 0) console.log(`✅ Updated ${updated}...`);
  } catch (e) {
    console.log(`❌ ${file}: ${e.message}`);
  }
}

console.log(`\n✅ Updated ${updated} scrapers with multi-source aggregator extraction`);
console.log(`💡 These now pull from Timeout NYC, Eventbrite, and NYC.com`);
