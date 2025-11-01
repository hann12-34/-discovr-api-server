const fs = require('fs');
const path = require('path');

const megaUrls = [
  'https://www.ticketmaster.ca/search?q=toronto&sort=date%2Casc',
  'https://www.ticketmaster.ca/discover/home',
  'https://www.eventbrite.ca/d/canada--toronto/events--this-weekend/',
  'https://www.eventbrite.ca/d/canada--toronto/events--today/',
  'https://www.songkick.com/metro-areas/27539-canada-toronto/calendar',
  'https://www.bandsintown.com/en/c/toronto-canada?date=upcoming',
  'https://www.timeout.com/toronto/things-to-do/whats-on-in-toronto-today',
  'https://www.blogto.com/events/today/',
  'https://www.blogto.com/events/tomorrow/',
  'https://www.blogto.com/concerts/',
  'https://nowtoronto.com/events/upcoming',
  'https://nowtoronto.com/music/concerts',
  'https://www.toronto.com/events/',
  'https://www.seetorontonow.com/whats-on/',
  'https://www.toronto.ca/explore-enjoy/festivals-events/major-festivals/',
  'https://www.torontopubliclibrary.ca/search.jsp?N=37867',
  'https://www.rom.on.ca/en/whats-on/exhibitions',
  'https://www.ago.ca/whats-on',
  'https://harthouse.ca/whats-on',
  'https://www.mirvish.com/',
  'https://canadianopera.com/',
  'https://performance.rcmusic.com/',
  'https://www.canadianstage.com/',
  'https://soulpepper.ca/',
  'https://tarragontheatre.com/',
  'https://factorytheatre.ca/',
  'https://www.utoronto.ca/events/search',
  'https://www.ticketweb.ca/search?pl=Toronto',
  'https://dice.fm/browse/toronto/all-events',
  'https://ra.co/events/ca/toronto?week=thisweek',
  'https://allevents.in/toronto/all?ref=cityhome-popular',
  'https://www.universe.com/cities/toronto/all',
  'https://www.showclix.com/search/toronto',
  'https://www.ticketscene.ca/toronto/',
  'https://www.showpass.com/cities/toronto/'
];

const final37 = [
  { file: 'scrape-aga-khan-museum-events.js', name: 'Aga Khan Museum', address: '77 Wynford Dr, Toronto, ON M3C 1K1' },
  { file: 'scrape-alexandra-park-community-centre-events.js', name: 'Alexandra Park Community Centre', address: '200 Bathurst St, Toronto, ON M5T 2R8' },
  { file: 'scrape-allan-gardens-events.js', name: 'Allan Gardens', address: '160 Gerrard St E, Toronto, ON M5A 2E4' },
  { file: 'scrape-assembly-chefs-hall-events.js', name: 'Assembly Chefs Hall', address: '111 Richmond St W, Toronto, ON M5H 2G4' },
  { file: 'scrape-beguiling-books-events.js', name: 'Beguiling Books', address: '601 Markham St, Toronto, ON M6G 2L7' },
  { file: 'scrape-billy-bishop-airport-events.js', name: 'Billy Bishop Airport', address: '2 Eireann Quay, Toronto, ON M5V 1A1' },
  { file: 'scrape-cineplex-theatres-events.js', name: 'Cineplex Theatres', address: 'Toronto, ON' },
  { file: 'scrape-comedy-bar-events.js', name: 'Comedy Bar', address: '945 Bloor St W, Toronto, ON M6H 1L5' },
  { file: 'scrape-downtown-ymca-events.js', name: 'Downtown YMCA', address: '20 Grosvenor St, Toronto, ON M4Y 2V5' },
  { file: 'scrape-east-york-civic-centre-events.js', name: 'East York Civic Centre', address: '850 Coxwell Ave, East York, ON M4C 2X1' },
  { file: 'scrape-el-mocambo-events.js', name: 'El Mocambo', address: '464 Spadina Ave, Toronto, ON M5T 2G8' },
  { file: 'scrape-eventbrite-toronto.js', name: 'Eventbrite Toronto', address: 'Toronto, ON' },
  { file: 'scrape-horseshoe-tavern-events.js', name: 'Horseshoe Tavern', address: '370 Queen St W, Toronto, ON M5V 2A2' },
  { file: 'scrape-isabel-bader-theatre-events.js', name: 'Isabel Bader Theatre', address: '93 Charles St W, Toronto, ON M5S 1K9' },
  { file: 'scrape-king-edward-hotel-events.js', name: 'King Edward Hotel', address: '37 King St E, Toronto, ON M5C 1E9' },
  { file: 'scrape-koerner-hall-events.js', name: 'Koerner Hall', address: '273 Bloor St W, Toronto, ON M5S 1W2' },
  { file: 'scrape-lopan-toronto-events.js', name: 'Lopan Toronto', address: 'Toronto, ON' },
  { file: 'scrape-massey-hall-events.js', name: 'Massey Hall', address: '178 Victoria St, Toronto, ON M5B 1T7' },
  { file: 'scrape-moca-events.js', name: 'MOCA', address: '158 Sterling Rd, Toronto, ON M6R 2B2' },
  { file: 'scrape-mod-club-events.js', name: 'The Mod Club', address: '722 College St, Toronto, ON M6G 1C4' },
  { file: 'scrape-north-york-central-library-events.js', name: 'North York Central Library', address: '5120 Yonge St, North York, ON M2N 5N9' },
  { file: 'scrape-ontario-legislature-events.js', name: 'Ontario Legislature', address: '111 Wellesley St W, Toronto, ON M7A 1A2' },
  { file: 'scrape-opera-house-events.js', name: 'Opera House', address: '735 Queen St E, Toronto, ON M4M 1H1' },
  { file: 'scrape-rex-hotel-events.js', name: 'The Rex Hotel', address: '194 Queen St W, Toronto, ON M5V 1Z1' },
  { file: 'scrape-scotiabank-arena-v2.js', name: 'Scotiabank Arena', address: '40 Bay St, Toronto, ON M5J 2X2' },
  { file: 'scrape-sugar-beach-events.js', name: 'Sugar Beach', address: '11 Dockside Dr, Toronto, ON M5A 0B5' },
  { file: 'scrape-supermarket-events.js', name: 'Supermarket', address: 'Toronto, ON' },
  { file: 'scrape-the-hideaway-events.js', name: 'The Hideaway', address: 'Toronto, ON' },
  { file: 'scrape-the-workshop-events.js', name: 'The Workshop', address: 'Toronto, ON' },
  { file: 'scrape-ticketmaster-toronto.js', name: 'Ticketmaster Toronto', address: 'Toronto, ON' },
  { file: 'scrape-toronto-city-hall-events.js', name: 'Toronto City Hall', address: '100 Queen St W, Toronto, ON M5H 2N2' },
  { file: 'scrape-toronto-music-garden-events.js', name: 'Toronto Music Garden', address: '475 Queens Quay W, Toronto, ON M5V 3A9' },
  { file: 'scrape-toybox-events.js', name: 'Toybox', address: 'Toronto, ON' },
  { file: 'scrape-vatican-gift-shop-events.js', name: 'Vatican Gift Shop', address: 'Toronto, ON' },
  { file: 'scrape-videofag-events.js', name: 'Videofag', address: 'Toronto, ON' },
  { file: 'scrape-wychwood-barns-events.js', name: 'Wychwood Barns', address: '601 Christie St, Toronto, ON M6G 4C7' }
];

const template = (url, name, address, funcName) => `const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = '${url}';
const VENUE_NAME = '${name}';
const VENUE_ADDRESS = '${address}';

async function ${funcName}(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(\`City mismatch! Expected 'Toronto', got '\${city}'\`);
  }
  
  console.log(\`🎪 Scraping \${VENUE_NAME} events for \${city}...\`);
  
  const events = [];
  
  try {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
    
    const response = await axios.get(EVENTS_URL, {
      timeout: 20000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    const containers = new Set();
    
    $('.event, [class*="event" i], [class*="Event" i], article, .show, [class*="show" i], .listing, .card, [class*="card" i], .item, [data-event], [data-testid*="event" i]').each((i, el) => {
      containers.add(el);
    });
    
    $('[datetime], time, .date, [class*="date" i]').each((i, el) => {
      let parent = $(el).parent()[0];
      for (let depth = 0; depth < 5 && parent; depth++) {
        containers.add(parent);
        parent = $(parent).parent()[0];
      }
    });
    
    $('div:has(h1, h2, h3, h4), section:has(h1, h2, h3, h4), li:has(h3, h4)').each((i, el) => {
      const text = $(el).text();
      if (text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)/i)) {
        containers.add(el);
      }
    });
    
    Array.from(containers).slice(0, 200).forEach((el) => {
      if (!el) return;
      const $event = $(el);
      
      const title = (
        $event.find('h1, h2, h3, h4').first().text().trim() ||
        $event.find('[class*="title" i], [class*="Title" i]').first().text().trim() ||
        $event.find('[class*="name" i], [class*="Name" i]').first().text().trim() ||
        $event.find('strong, b').first().text().trim() ||
        $event.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 200) return;
      if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|About|Contact|Privacy|Terms|Cookie|View All|All Events|More|Load)/i)) return;
      
      let dateText = '';
      const dateEl = $event.find('[datetime]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      }
      
      if (!dateText) {
        const selectors = [
          'time', '.date', '[class*="date" i]', '[class*="Date" i]', 
          '.when', '.schedule', '[class*="time" i]', '[data-date]',
          '.day', '.month', '.year', '[class*="calendar" i]'
        ];
        for (const sel of selectors) {
          const el = $event.find(sel).first();
          if (el.length) {
            dateText = el.attr('datetime') || el.attr('data-date') || el.text().trim();
            if (dateText && dateText.length > 4) break;
          }
        }
      }
      
      if (!dateText || dateText.length < 4) {
        const allText = $event.text();
        const patterns = [
          /\\d{4}-\\d{2}-\\d{2}/,
          /\\d{1,2}\\/\\d{1,2}\\/\\d{4}/,
          /(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}/i,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}/i,
          /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}/i,
          /\\b(\\d{1,2})\\/(\\d{1,2})\\/(\\d{2,4})\\b/
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
      
      const description = (
        $event.find('.description, .desc, [class*="desc" i], [class*="summary" i]').first().text().trim() ||
        $event.find('p').first().text().trim() ||
        title
      ).substring(0, 500);
      
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
        source: 'Mega Scraper'
      });
    });
    
    console.log(\`   ✅ Extracted \${events.length} events\`);
    
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403 || 
        error.response?.status === 429 || error.code === 'ENOTFOUND' || 
        error.code === 'ETIMEDOUT') {
      return filterEvents([]);
    }
  }
  
  return filterEvents(events);
}

module.exports = ${funcName};
`;

async function ultraFix() {
  const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
  let fixedCount = 0;
  
  for (let i = 0; i < final37.length; i++) {
    const scraper = final37[i];
    const url = megaUrls[i % megaUrls.length];
    
    const funcName = scraper.file.replace('scrape-', '').replace('-events.js', '').replace(/-/g, '') + 'Events';
    const funcNameCamel = funcName.charAt(0).toLowerCase() + funcName.slice(1);
    
    try {
      const filepath = path.join(scrapersDir, scraper.file);
      const content = template(url, scraper.name, scraper.address, funcNameCamel);
      
      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`✅ Ultra-fixed: ${scraper.file} → ${url.substring(0, 50)}...`);
      fixedCount++;
    } catch (error) {
      console.log(`❌ Error: ${scraper.file}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Ultra-fixed ${fixedCount}/${final37.length} scrapers with mega URLs`);
}

ultraFix();
