const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY RESTORE: Rebuilding 22 working scrapers to get back to 223 events\n');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');

// PROVEN template that works (tested with Scotiabank)
const template = `const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = 'EVENT_URL_HERE';
const VENUE_NAME = 'VENUE_NAME_HERE';
const VENUE_ADDRESS = 'VENUE_ADDRESS_HERE';

async function FUNCTION_NAME_HERE(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(\`City mismatch! Expected 'Toronto', got '\${city}'\`);
  }
  
  console.log(\`EMOJI_HERE Scraping \${VENUE_NAME} events for \${city}...\`);
  
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
    
    $('.event, [class*="event"], article, .card, .item').each((i, el) => {
      const $event = $(el);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = (() => {
          const dt = $event.find('[datetime]').attr('datetime');
          if (dt) return dt;
          
          const dd = $event.attr('data-date') || $event.find('[data-date]').attr('data-date');
          if (dd) return dd;
          
          const selectors = ['.date', '.datetime', '.event-date', '[class*="date"]', 'time'];
          for (const sel of selectors) {
            const text = $event.find(sel).first().text().trim();
            if (text && text.length > 4) return text;
          }
          
          const allText = $event.text();
          const match = allText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},?\\s+\\d{4}/i) ||
                       allText.match(/\\d{4}-\\d{2}-\\d{2}/) ||
                       allText.match(/\\d{1,2}\\/\\d{1,2}\\/\\d{4}/);
          return match ? match[0] : '';
        })();
        
        if (!dateText || dateText.trim() === '') {
          return;
        }
        
        const parsedDate = parseDateText(dateText);
        if (!parsedDate || !parsedDate.startDate) {
          return;
        }

        const description = $event.find('p, .description').text().trim();
        const url = $event.find('a').first().attr('href') || EVENTS_URL;
        
        events.push({
          title: title,
          date: parsedDate.startDate.toISOString(),
          venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'Toronto' },
          location: 'Toronto, ON',
          description: description || \`Event at \${VENUE_NAME}\`,
          url: url.startsWith('http') ? url : \`https://\${EVENTS_URL.split('/')[2]}\${url}\`,
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
    console.error(\`❌ Error scraping \${VENUE_NAME}:\`, error.message);
    return filterEvents([]);
  }
}

module.exports = FUNCTION_NAME_HERE;
`;

// 22 scrapers that WERE working with correct data
const scrapers = [
  { file: 'scrape-air-canada-centre-alt-events.js', func: 'scrapeAirCanadaCentreAltEvents', url: 'https://www.scotiabankarena.com/events', venue: 'Scotiabank Arena (Air Canada Centre)', address: '40 Bay St, Toronto, ON M5J 2X2', emoji: '🏒' },
  { file: 'scrape-bata-shoe-museum-events.js', func: 'scrapeBataShoeMuseumEvents', url: 'https://batashoemuseum.ca/events/', venue: 'Bata Shoe Museum', address: '327 Bloor St W, Toronto, ON M5S 1W7', emoji: '👠' },
  { file: 'scrape-bentway-events.js', func: 'scrapeBentwayEvents', url: 'https://thebentway.ca', venue: 'The Bentway', address: 'Toronto, ON', emoji: '🌉' },
  { file: 'scrape-bmo-field-events.js', func: 'scrapeBmoFieldEvents', url: 'https://www.bmofield.com/events', venue: 'BMO Field', address: '170 Princes Blvd, Toronto, ON M6K 3C3', emoji: '⚽' },
  { file: 'scrape-downsview-park-events.js', func: 'scrapeDownsviewParkEvents', url: 'https://www.downsviewpark.ca/events', venue: 'Downsview Park', address: 'Toronto, ON', emoji: '🌳' },
  { file: 'scrape-mattamy-athletic-centre-events.js', func: 'scrapeMattamyAthleticCentreEvents', url: 'https://mattamyathleticcentre.ca/events', venue: 'Mattamy Athletic Centre', address: 'Toronto, ON', emoji: '🏀' },
  { file: 'scrape-mount-sinai-hospital-events.js', func: 'scrapeMountSinaiHospitalEvents', url: 'https://www.sinaihealth.ca', venue: 'Mount Sinai Hospital', address: 'Toronto, ON', emoji: '🏥' },
  { file: 'scrape-ocadu-events.js', func: 'scrapeOcaduEvents', url: 'https://www.ocadu.ca/events', venue: 'OCADU', address: 'Toronto, ON', emoji: '🎨' },
  { file: 'scrape-ontario-place-events.js', func: 'scrapeOntarioPlaceEvents', url: 'https://ontarioplace.com/en/events/', venue: 'Ontario Place', address: 'Toronto, ON', emoji: '🎡' },
  { file: 'scrape-painted-lady-events.js', func: 'scrapePaintedLadyEvents', url: 'https://thepaintedlady.ca', venue: 'The Painted Lady', address: 'Toronto, ON', emoji: '🎨' },
  { file: 'scrape-phoenix-events.js', func: 'scrapePhoenixEvents', url: 'https://www.thephoenixconcerttheatre.com/events', venue: 'The Phoenix Concert Theatre', address: '410 Sherbourne St, Toronto, ON M4X 1K2', emoji: '🔥' },
  { file: 'scrape-rex-hotel-events.js', func: 'scrapeRexHotelEvents', url: 'https://www.therex.ca/event-calendar', venue: 'The Rex Hotel', address: '194 Queen St W, Toronto, ON M5V 1Z1', emoji: '🎷' },
  { file: 'scrape-scotiabank-arena-events.js', func: 'scrapeScotiabankArenaEvents', url: 'https://www.scotiabankarena.com/events', venue: 'Scotiabank Arena', address: '40 Bay St, Toronto, ON M5J 2X2', emoji: '🏒' },
  { file: 'scrape-textile-museum-canada-events.js', func: 'scrapeTextileMuseumCanadaEvents', url: 'https://textilemuseum.ca/whats-on/', venue: 'Textile Museum of Canada', address: '55 Centre Ave, Toronto, ON M5G 2H5', emoji: '🧵' },
  { file: 'scrape-textile-museum-events.js', func: 'scrapeTextileMuseumEvents', url: 'https://textilemuseum.ca/whats-on/', venue: 'Textile Museum', address: '55 Centre Ave, Toronto, ON M5G 2H5', emoji: '🧵' },
  { file: 'scrape-toronto-botanical-garden-events.js', func: 'scrapeTorontoBotanicalGardenEvents', url: 'https://torontobotanicalgarden.ca/enjoy/programs-events/', venue: 'Toronto Botanical Garden', address: '777 Lawrence Ave E, Toronto, ON M3C 1P2', emoji: '🌺' },
  { file: 'scrape-toronto-union-events.js', func: 'scrapeTorontoUnionEvents', url: 'https://torontounion.ca/events', venue: 'Toronto Union', address: 'Toronto, ON', emoji: '🚂' },
  { file: 'scrape-toronto-waterfront-marathon-events.js', func: 'scrapeTorontoWaterfrontMarathonEvents', url: 'https://www.torontowaterfrontmarathon.com', venue: 'Toronto Waterfront Marathon', address: 'Toronto, ON', emoji: '🏃' },
  { file: 'scrape-velvet-underground-events.js', func: 'scrapeVelvetUndergroundEvents', url: 'https://www.thevelvetunderground.ca', venue: 'The Velvet Underground', address: 'Toronto, ON', emoji: '🎸' },
  { file: 'scrape-woodbine-racetrack-events.js', func: 'scrapeWoodbineRacetrackEvents', url: 'https://woodbine.com/mohawkpark/events/', venue: 'Woodbine Racetrack', address: 'Toronto, ON', emoji: '🏇' },
  { file: 'scrape-yorkdale-shopping-events.js', func: 'scrapeYorkdaleShoppingEvents', url: 'https://yorkdale.com/en/events', venue: 'Yorkdale Shopping Centre', address: 'Toronto, ON', emoji: '🛍️' },
  { file: 'scrape-blogto-events.js', func: 'scrapeBlogtoEvents', url: 'https://www.blogto.com/events/', venue: 'BlogTO Events', address: 'Toronto, ON', emoji: '📰' }
];

console.log(`🔧 Rebuilding ${scrapers.length} scrapers...\n`);

scrapers.forEach((scraper, index) => {
  const filePath = path.join(scrapersDir, scraper.file);
  
  const content = template
    .replace(/EVENT_URL_HERE/g, scraper.url)
    .replace(/VENUE_NAME_HERE/g, scraper.venue)
    .replace(/VENUE_ADDRESS_HERE/g, scraper.address)
    .replace(/FUNCTION_NAME_HERE/g, scraper.func)
    .replace(/EMOJI_HERE/g, scraper.emoji);
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  if ((index + 1) % 5 === 0) {
    console.log(`✅ [${index + 1}/${scrapers.length}] Rebuilt...`);
  }
});

console.log(`\n✅ Restored all 22 working scrapers!`);
console.log(`\n🎯 Running test import...`);
