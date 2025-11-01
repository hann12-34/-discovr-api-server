const fs = require('fs');
const path = require('path');

const brokenScrapers = [
  'scrape-aga-khan-museum-events.js',
  'scrape-alexandra-park-community-centre-events.js',
  'scrape-allan-gardens-events.js',
  'scrape-arraymusic-events.js',
  'scrape-assembly-chefs-hall-events.js',
  'scrape-bar-dem-events.js',
  'scrape-beguiling-books-events.js',
  'scrape-billy-bishop-airport-events.js',
  'scrape-canada-life-centre-events.js',
  'scrape-centre-island-events.js',
  'scrape-cineplex-theatres-events.js',
  'scrape-comedy-bar-events.js',
  'scrape-crow-s-theatre-events.js',
  'scrape-design-exchange-events.js',
  'scrape-downtown-ymca-events.js',
  'scrape-east-york-civic-centre-events.js',
  'scrape-el-mocambo-events.js',
  'scrape-elgin-theatre-events.js',
  'scrape-harbord-collegiate-events.js',
  'scrape-hart-house-theatre-events.js',
  'scrape-horseshoe-tavern-events.js',
  'scrape-isabel-bader-theatre-events.js',
  'scrape-king-edward-hotel-events.js',
  'scrape-koerner-hall-events.js',
  'scrape-lopan-toronto-events.js',
  'scrape-massey-hall-events.js',
  'scrape-moca-events.js',
  'scrape-north-york-central-library-events.js',
  'scrape-ontario-legislature-events.js',
  'scrape-opera-house-events.js',
  'scrape-polson-pier-events.js',
  'scrape-queen-street-shopping-events.js',
  'scrape-rex-hotel-events.js',
  'scrape-scotiabank-arena-v2.js',
  'scrape-social-capital-theatre-events.js',
  'scrape-sound-academy-events.js',
  'scrape-st-pauls-basilica-events.js',
  'scrape-sugar-beach-events.js',
  'scrape-supermarket-events.js',
  'scrape-the-hideaway-events.js',
  'scrape-the-mod-club-events.js',
  'scrape-the-steady-cafe-events.js',
  'scrape-the-workshop-events.js',
  'scrape-toronto-botanical-garden-events.js',
  'scrape-toronto-city-hall-events.js',
  'scrape-toronto-music-garden-events.js',
  'scrape-toybox-events.js',
  'scrape-vatican-gift-shop-events.js',
  'scrape-wychwood-barns-events.js'
];

async function convertToPuppeteer() {
  const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
  let convertedCount = 0;
  
  for (const filename of brokenScrapers) {
    try {
      const filepath = path.join(scrapersDir, filename);
      
      if (!fs.existsSync(filepath)) {
        console.log(`⚠️  File not found: ${filename}`);
        continue;
      }
      
      const content = fs.readFileSync(filepath, 'utf8');
      
      // Extract EVENTS_URL, VENUE_NAME, VENUE_ADDRESS
      const urlMatch = content.match(/const EVENTS_URL = ['"](.+?)['"]/);
      const nameMatch = content.match(/const VENUE_NAME = ['"](.+?)['"]/);
      const addressMatch = content.match(/const VENUE_ADDRESS = ['"](.+?)['"]/);
      
      if (!urlMatch || !nameMatch || !addressMatch) {
        console.log(`⚠️  Missing constants in: ${filename}`);
        continue;
      }
      
      const eventsUrl = urlMatch[1];
      const venueName = nameMatch[1];
      const venueAddress = addressMatch[1];
      
      // Extract function name
      const functionMatch = content.match(/async function (\w+)/);
      const functionName = functionMatch ? functionMatch[1] : 'scrapeEvents';
      
      // Create new Puppeteer-based scraper
      const newContent = `const puppeteer = require('puppeteer');
const { parseDateText } = require('../../utils/city-util');
const { filterEvents } = require('../../utils/eventFilter');

const EVENTS_URL = '${eventsUrl}';
const VENUE_NAME = '${venueName}';
const VENUE_ADDRESS = '${venueAddress}';

async function ${functionName}(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(\`City mismatch! Expected 'Toronto', got '\${city}'\`);
  }
  
  console.log(\`🎪 Scraping \${VENUE_NAME} events for \${city}...\`);
  
  const events = [];
  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(EVENTS_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForTimeout(3000);
    
    const scrapedEvents = await page.evaluate(() => {
      const eventElements = [];
      const selectors = [
        '.event', '[class*="event"]', 'article', '.show', '[class*="show"]',
        '.listing', '.card', '[class*="card"]', '.performance', '.program',
        'li.entry', '.post', '.item', '[role="article"]'
      ];
      
      const foundElements = new Set();
      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => foundElements.add(el));
      }
      
      document.querySelectorAll('[datetime], time, .date, [class*="date"]').forEach(el => {
        let parent = el.parentElement;
        let depth = 0;
        while (parent && parent !== document.body && depth < 5) {
          foundElements.add(parent);
          if (parent.tagName === 'ARTICLE' || parent.classList.contains('event')) break;
          parent = parent.parentElement;
          depth++;
        }
      });
      
      foundElements.forEach(el => {
        const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '[class*="title"]', '.name', '[class*="name"]', 'strong', 'b', 'a'];
        let title = '';
        for (const sel of titleSelectors) {
          const titleEl = el.querySelector(sel);
          if (titleEl && titleEl.textContent.trim()) {
            title = titleEl.textContent.trim();
            break;
          }
        }
        
        if (!title || title.length < 3 || title.length > 200) return;
        if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|About|Contact|Privacy|Terms|All Events|View All)/i)) return;
        
        let dateText = '';
        const dateEl = el.querySelector('[datetime]');
        if (dateEl) {
          dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
        } else {
          const dateSelectors = ['time', '.date', '[class*="date"]', '.when', '.schedule', '[class*="time"]', '[data-date]'];
          for (const sel of dateSelectors) {
            const dEl = el.querySelector(sel);
            if (dEl) {
              dateText = dEl.getAttribute('datetime') || dEl.getAttribute('data-date') || dEl.textContent.trim();
              if (dateText && dateText.length > 4) break;
            }
          }
        }
        
        if (!dateText) {
          const allText = el.textContent;
          const patterns = [
            /\d{4}-\d{2}-\d{2}/,
            /\d{1,2}\/\d{1,2}\/\d{4}/,
            /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i,
            /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i
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
        
        const descEl = el.querySelector('.description, .desc, [class*="desc"], p');
        const description = descEl ? descEl.textContent.trim().substring(0, 500) : title;
        
        const linkEl = el.querySelector('a');
        const url = linkEl ? linkEl.href : '';
        
        eventElements.push({ title, dateText, description, url });
      });
      
      return eventElements;
    });
    
    console.log(\`   ✅ Extracted \${scrapedEvents.length} events\`);
    
    for (const evt of scrapedEvents) {
      const parsedDate = parseDateText(evt.dateText);
      if (!parsedDate || !parsedDate.startDate) continue;
      
      events.push({
        title: evt.title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'Toronto' },
        location: 'Toronto, ON',
        description: evt.description,
        url: evt.url || EVENTS_URL,
        source: 'Puppeteer Scraper'
      });
    }
    
  } catch (error) {
    if (error.message.includes('net::ERR_NAME_NOT_RESOLVED') || 
        error.message.includes('net::ERR_CONNECTION_REFUSED') ||
        error.message.includes('Navigation timeout')) {
      return filterEvents([]);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return filterEvents(events);
}

module.exports = ${functionName};
`;
      
      fs.writeFileSync(filepath, newContent, 'utf8');
      console.log(`✅ Converted to Puppeteer: ${filename}`);
      convertedCount++;
      
    } catch (error) {
      console.log(`❌ Error converting ${filename}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Converted ${convertedCount}/${brokenScrapers.length} scrapers to Puppeteer`);
}

convertToPuppeteer();
