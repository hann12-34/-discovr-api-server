const fs = require('fs');
const path = require('path');

// REAL Toronto nightlife venues with their ACTUAL event pages
const realNightlifeVenues = [
  { file: 'scrape-rebel-nightclub-events.js', name: 'Rebel Nightclub', address: '11 Polson St, Toronto, ON M5A 1A4', url: 'https://rebeltoronto.com/events/', func: 'rebelnightclubEvents' },
  { file: 'scrape-toybox-nightclub-events.js', name: 'Toybox Nightclub', address: '473 Adelaide St W, Toronto, ON M5V 1T1', url: 'https://www.toyboxclub.com/events', func: 'toyboxnightclubEvents' },
  { file: 'scrape-coda-nightclub-events.js', name: 'Coda', address: '794 Bathurst St, Toronto, ON M5R 3G1', url: 'https://codatoronto.com/', func: 'codanightclubEvents' },
  { file: 'scrape-noir-nightclub-events.js', name: 'Noir', address: '2200 Yonge St, Toronto, ON M4S 2C6', url: 'https://noirtoronto.com/events/', func: 'noirnightclubEvents' },
  { file: 'scrape-stories-nightclub-events.js', name: 'Stories', address: '379 King St W, Toronto, ON M5V 1K1', url: 'https://storiestoronto.com/', func: 'storiesnightclubEvents' },
  { file: 'scrape-velvet-underground-events.js', name: 'Velvet Underground', address: '508 Queen St W, Toronto, ON M5V 2B3', url: 'https://thevelvetunderground.ca/', func: 'velvetundergroundEvents' },
  { file: 'scrape-nest-nightclub-events.js', name: 'Nest', address: '423 College St, Toronto, ON M5T 1T1', url: 'https://nesttoronto.com/', func: 'nestnightclubEvents' },
  { file: 'scrape-lost-and-found-events.js', name: 'Lost and Found', address: '577 King St W, Toronto, ON M5V 1M1', url: 'https://lostandfoundbar.com/events/', func: 'lostandfoundEvents' },
  { file: 'scrape-the-ballroom-events.js', name: 'The Ballroom', address: '146 John St, Toronto, ON M5V 2E3', url: 'https://theballroom.ca/', func: 'theballroomEvents' },
  { file: 'scrape-bambi-nightclub-events.js', name: 'Bambi', address: '1265 Dundas St W, Toronto, ON M6J 1X8', url: 'https://www.bambitbay.com/', func: 'bambinightclubEvents' },
  { file: 'scrape-get-well-bar-events.js', name: 'Get Well', address: '1181 Dundas St W, Toronto, ON M6J 1X3', url: 'https://www.getwellbar.com/', func: 'getwellbarEvents' },
  { file: 'scrape-regulars-bar-events.js', name: 'Regulars Bar', address: '554 Dundas St W, Toronto, ON M5T 1H5', url: 'https://regularsbar.com/', func: 'regularsbarEvents' },
  { file: 'scrape-dive-bar-events.js', name: 'Dive Bar', address: '1631 Dundas St W, Toronto, ON M6K 1V2', url: 'https://www.divebarto.com/', func: 'divebarEvents' },
  { file: 'scrape-trinity-common-events.js', name: 'Trinity Common', address: '60 Atlantic Ave, Toronto, ON M6K 1X9', url: 'https://trinitycommon.ca/events/', func: 'trinitycommonEvents' },
  { file: 'scrape-bottega-eventi-events.js', name: 'Bottega Eventi', address: '55 Mill St Building 63, Toronto, ON M5A 3C4', url: 'https://www.bottegaeventi.com/', func: 'bottegaeventiEvents' }
];

const scraperTemplate = `const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = 'PLACEHOLDER_URL';
const VENUE_NAME = 'PLACEHOLDER_NAME';
const VENUE_ADDRESS = 'PLACEHOLDER_ADDRESS';

async function PLACEHOLDER_FUNC(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(\`City mismatch! Expected 'Toronto', got '\${city}'\`);
  }
  
  console.log(\`🌙 Scraping \${VENUE_NAME} nightlife events for \${city}...\`);
  
  const events = [];
  
  try {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const response = await axios.get(EVENTS_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event containers
    const containers = new Set();
    
    // Look for event-specific elements
    $('.event, [class*="event"], article, .show, [class*="show"], .listing, .card, [class*="card"]').each((i, el) => {
      containers.add(el);
    });
    
    // Look for date elements and find their parent containers
    $('[datetime], time, .date, [class*="date"]').each((i, el) => {
      let parent = $(el).parent()[0];
      for (let depth = 0; depth < 4 && parent; depth++) {
        containers.add(parent);
        parent = $(parent).parent()[0];
      }
    });
    
    // Process each container
    Array.from(containers).forEach((el) => {
      if (!el) return;
      const $event = $(el);
      
      // Extract title
      const title = (
        $event.find('h1').first().text().trim() ||
        $event.find('h2').first().text().trim() ||
        $event.find('h3').first().text().trim() ||
        $event.find('h4').first().text().trim() ||
        $event.find('.title, [class*="title"]').first().text().trim() ||
        $event.find('.name, [class*="name"]').first().text().trim() ||
        $event.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 200) return;
      if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|About|Contact|View All)/i)) return;
      
      // Extract date
      let dateText = '';
      const dateEl = $event.find('[datetime]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      } else {
        const selectors = ['time', '.date', '[class*="date"]', '.when', '.schedule'];
        for (const sel of selectors) {
          dateText = $event.find(sel).first().text().trim();
          if (dateText && dateText.length > 4) break;
        }
      }
      
      if (!dateText) {
        const allText = $event.text();
        const patterns = [
          /\\d{4}-\\d{2}-\\d{2}/,
          /\\d{1,2}\\/\\d{1,2}\\/\\d{4}/,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}/i,
          /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}/i
        ];
        for (const pattern of patterns) {
          const match = allText.match(pattern);
          if (match) {
            dateText = match[0];
            break;
          }
        }
      }
      
      if (!dateText || dateText.length < 4) return;
      
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) return;
      
      // Extract description
      const description = (
        $event.find('.description, .desc, p').first().text().trim() ||
        title
      ).substring(0, 500);
      
      // Extract URL
      const url = $event.find('a').first().attr('href') || EVENTS_URL;
      const fullUrl = url.startsWith('http') ? url : 
                     url.startsWith('/') ? \`https://\${new URL(EVENTS_URL).hostname}\${url}\` : 
                     EVENTS_URL;
      
      events.push({
        title: title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'Toronto' },
        location: 'Toronto, ON',
        description: description,
        url: fullUrl,
        category: 'Nightlife',
        source: 'Nightlife Scraper'
      });
    });
    
    console.log(\`   🌙 Extracted \${events.length} nightlife events\`);
    
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403 || error.code === 'ENOTFOUND') {
      console.log(\`   ⚠️  0 events (venue site unavailable)\`);
      return filterEvents([]);
    }
    throw error;
  }
  
  return filterEvents(events);
}

module.exports = PLACEHOLDER_FUNC;
`;

async function createNightlifeScrapers() {
  const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
  let createdCount = 0;
  
  console.log('🌙 Creating dedicated nightlife venue scrapers...\n');
  
  for (const venue of realNightlifeVenues) {
    try {
      const filepath = path.join(scrapersDir, venue.file);
      
      let content = scraperTemplate;
      content = content.replace(/PLACEHOLDER_URL/g, venue.url);
      content = content.replace(/PLACEHOLDER_NAME/g, venue.name);
      content = content.replace(/PLACEHOLDER_ADDRESS/g, venue.address);
      content = content.replace(/PLACEHOLDER_FUNC/g, venue.func);
      
      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`✅ ${venue.name} → ${venue.url}`);
      createdCount++;
    } catch (error) {
      console.log(`❌ ${venue.name}: ${error.message}`);
    }
  }
  
  console.log(`\n🎯 Created ${createdCount}/${realNightlifeVenues.length} real nightlife scrapers`);
  console.log(`\n💡 These scrapers target REAL venue websites with actual event listings`);
  console.log(`   No fake data, no fallback aggregators, no samples!`);
}

createNightlifeScrapers();
