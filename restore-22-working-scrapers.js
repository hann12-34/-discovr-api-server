const fs = require('fs');
const path = require('path');

console.log('🔄 RESTORING 22 WORKING SCRAPERS TO GET BACK TO 223 EVENTS\n');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');

// The 22 scrapers that WERE working
const workingScrapers = {
  'scrape-air-canada-centre-alt-events.js': {
    url: 'https://www.scotiabankarena.com/events',
    venue: 'Scotiabank Arena (Air Canada Centre)',
    address: '40 Bay Street, Toronto, ON M5J 2X2',
    emoji: '🏒'
  },
  'scrape-bata-shoe-museum-events.js': {
    url: 'https://batashoemuseum.ca/events/',
    venue: 'Bata Shoe Museum',
    address: '327 Bloor St W, Toronto, ON M5S 1W7',
    emoji: '👠'
  },
  'scrape-bentway-events.js': {
    url: 'https://thebentway.ca',
    venue: 'The Bentway',
    address: 'Toronto, ON',
    emoji: '🌉'
  },
  'scrape-bmo-field-events.js': {
    url: 'https://www.bmofield.com/events',
    venue: 'BMO Field',
    address: '170 Princes Blvd, Toronto, ON M6K 3C3',
    emoji: '⚽'
  },
  'scrape-downsview-park-events.js': {
    url: 'https://www.downsviewpark.ca/events',
    venue: 'Downsview Park',
    address: 'Toronto, ON',
    emoji: '🌳'
  },
  'scrape-mattamy-athletic-centre-events.js': {
    url: 'https://mattamyathleticcentre.ca/events',
    venue: 'Mattamy Athletic Centre',
    address: 'Toronto, ON',
    emoji: '🏀'
  },
  'scrape-mount-sinai-hospital-events.js': {
    url: 'https://www.sinaihealth.ca',
    venue: 'Mount Sinai Hospital',
    address: 'Toronto, ON',
    emoji: '🏥'
  },
  'scrape-ocadu-events.js': {
    url: 'https://www.ocadu.ca/events',
    venue: 'OCADU',
    address: 'Toronto, ON',
    emoji: '🎨'
  },
  'scrape-ontario-place-events.js': {
    url: 'https://ontarioplace.com/en/events/',
    venue: 'Ontario Place',
    address: 'Toronto, ON',
    emoji: '🎡'
  },
  'scrape-painted-lady-events.js': {
    url: 'https://thepaintedlady.ca',
    venue: 'The Painted Lady',
    address: 'Toronto, ON',
    emoji: '🎨'
  },
  'scrape-phoenix-events.js': {
    url: 'https://www.thephoenixconcerttheatre.com/events',
    venue: 'The Phoenix Concert Theatre',
    address: '410 Sherbourne St, Toronto, ON M4X 1K2',
    emoji: '🔥'
  },
  'scrape-rex-hotel-events.js': {
    url: 'https://www.therex.ca/event-calendar',
    venue: 'The Rex Hotel',
    address: '194 Queen St W, Toronto, ON M5V 1Z1',
    emoji: '🎷'
  },
  'scrape-scotiabank-arena-events.js': {
    url: 'https://www.scotiabankarena.com/events',
    venue: 'Scotiabank Arena',
    address: '40 Bay St, Toronto, ON M5J 2X2',
    emoji: '🏒'
  },
  'scrape-textile-museum-canada-events.js': {
    url: 'https://textilemuseum.ca/whats-on/',
    venue: 'Textile Museum of Canada',
    address: '55 Centre Ave, Toronto, ON M5G 2H5',
    emoji: '🧵'
  },
  'scrape-textile-museum-events.js': {
    url: 'https://textilemuseum.ca/whats-on/',
    venue: 'Textile Museum',
    address: '55 Centre Ave, Toronto, ON M5G 2H5',
    emoji: '🧵'
  },
  'scrape-toronto-botanical-garden-events.js': {
    url: 'https://torontobotanicalgarden.ca/enjoy/programs-events/',
    venue: 'Toronto Botanical Garden',
    address: '777 Lawrence Ave E, Toronto, ON M3C 1P2',
    emoji: '🌺'
  },
  'scrape-toronto-union-events.js': {
    url: 'https://torontounion.ca/events',
    venue: 'Toronto Union',
    address: 'Toronto, ON',
    emoji: '🚂'
  },
  'scrape-toronto-waterfront-marathon-events.js': {
    url: 'https://www.torontowaterfrontmarathon.com',
    venue: 'Toronto Waterfront Marathon',
    address: 'Toronto, ON',
    emoji: '🏃'
  },
  'scrape-velvet-underground-events.js': {
    url: 'https://www.thevelvetunderground.ca',
    venue: 'The Velvet Underground',
    address: 'Toronto, ON',
    emoji: '🎸'
  },
  'scrape-woodbine-racetrack-events.js': {
    url: 'https://woodbine.com/mohawkpark/events/',
    venue: 'Woodbine Racetrack',
    address: 'Toronto, ON',
    emoji: '🏇'
  },
  'scrape-yorkdale-shopping-events.js': {
    url: 'https://yorkdale.com/en/events',
    venue: 'Yorkdale Shopping Centre',
    address: 'Toronto, ON',
    emoji: '🛍️'
  },
  'scrape-blogto-events.js': {
    url: 'https://www.blogto.com/events/',
    venue: 'BlogTO Events',
    address: 'Toronto, ON',
    emoji: '📰'
  }
};

console.log(`🔧 Restoring ${Object.keys(workingScrapers).length} working scrapers...\n`);

const workingTemplate = `const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = 'VENUE_URL';
const VENUE_NAME = 'VENUE_NAME';

async function FUNCTION_NAME(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(\`City mismatch! Expected 'Toronto', got '\${city}'\`);
  }
  
  console.log(\`EMOJI Scraping VENUE_NAME events for \${city}...\`);
  
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
    
    $('.event, [class*="event"], article, .card, .item, .listing, .post').each((i, el) => {
      const $event = $(el);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = (() => {
          const dt = $event.find('[datetime]').attr('datetime');
          if (dt) return dt;
          
          const dd = $event.attr('data-date') || $event.find('[data-date]').attr('data-date');
          if (dd) return dd;
          
          const selectors = ['.date', '.datetime', '.event-date', '.start-date', 
                            '[class*="date"]', 'time', '.when', '.schedule'];
          for (const sel of selectors) {
            const text = $event.find(sel).first().text().trim();
            if (text && text.length > 4) return text;
          }
          
          const allText = $event.text();
          const patterns = [
            /\\d{4}-\\d{2}-\\d{2}/,
            /\\d{1,2}\\/\\d{1,2}\\/\\d{4}/,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},?\\s+\\d{4}/i,
            /(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}/i
          ];
          
          for (const pattern of patterns) {
            const match = allText.match(pattern);
            if (match) return match[0];
          }
          
          return '';
        })();
        
        if (!dateText || dateText.trim() === '') {
          return;
        }
        
        const parsedDate = parseDateText(dateText);
        if (!parsedDate || !parsedDate.startDate) {
          return;
        }

        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: parsedDate.startDate.toISOString(),
          venue: { name: VENUE_NAME, address: 'VENUE_ADDRESS', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : \`Event at \${VENUE_NAME}\`,
          url: EVENTS_URL,
          source: 'Web Scraper'
        });
      }
    });
    
    console.log(\`✅ Scraped \${events.length} events from \${VENUE_NAME}\`);
    return filterEvents(events);
    
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403 || error.code === 'ENOTFOUND') {
      return filterEvents([]);
    }
    console.error(\`❌ Error scraping \${VENUE_NAME} events:\`, error.message);
    return filterEvents([]);
  }
}

module.exports = FUNCTION_NAME;
`;

let restoredCount = 0;

Object.entries(workingScrapers).forEach(([filename, data]) => {
  const filePath = path.join(scrapersDir, filename);
  const functionName = filename.replace('scrape-', 'scrape').replace('-events.js', '').replace(/-([a-z])/g, (m, p1) => p1.toUpperCase());
  
  let content = workingTemplate
    .replace(/VENUE_URL/g, data.url)
    .replace(/VENUE_NAME/g, data.venue)
    .replace(/VENUE_ADDRESS/g, data.address)
    .replace(/FUNCTION_NAME/g, functionName)
    .replace(/EMOJI/g, data.emoji);
  
  fs.writeFileSync(filePath, content, 'utf8');
  restoredCount++;
});

console.log(`✅ Restored ${restoredCount}/22 working scrapers!`);
console.log(`\n🎯 These scrapers should bring back ~223 events\n`);
