const fs = require('fs');
const path = require('path');

// Resident Advisor venues that need Puppeteer
const raVenues = [
  { 
    file: 'scrape-stories-nightclub-events.js', 
    name: 'Stories', 
    address: '379 King St W, Toronto, ON M5V 1K1',
    url: 'https://ra.co/clubs/33851/events',
    func: 'storiesnightclubEvents'
  },
  { 
    file: 'scrape-velvet-underground-events.js', 
    name: 'Velvet Underground', 
    address: '508 Queen St W, Toronto, ON M5V 2B3',
    url: 'https://ra.co/clubs/4476/events',
    func: 'velvetundergroundEvents'
  },
  { 
    file: 'scrape-bambi-nightclub-events.js', 
    name: 'Bambi', 
    address: '1265 Dundas St W, Toronto, ON M6J 1X8',
    url: 'https://ra.co/clubs/69282/events',
    func: 'bambinightclubEvents'
  }
];

const puppeteerTemplate = `const puppeteer = require('puppeteer');
const { parseDateText } = require('../../utils/city-util');
const { filterEvents } = require('../../utils/eventFilter');

const EVENTS_URL = 'PLACEHOLDER_URL';
const VENUE_NAME = 'PLACEHOLDER_NAME';
const VENUE_ADDRESS = 'PLACEHOLDER_ADDRESS';

async function PLACEHOLDER_FUNC(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(\`City mismatch! Expected 'Toronto', got '\${city}'\`);
  }
  
  console.log(\`🌙 Scraping \${VENUE_NAME} nightlife events (Puppeteer) for \${city}...\`);
  
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
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(EVENTS_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for events to load
    await page.waitForTimeout(3000);
    
    // Extract events from the page
    const scrapedEvents = await page.evaluate(() => {
      const eventElements = [];
      
      // Resident Advisor specific selectors
      const eventCards = document.querySelectorAll('[data-tracking-id*="Event"], .event-item, [class*="EventItem"], article, li');
      
      eventCards.forEach(card => {
        // Extract title
        const titleEl = card.querySelector('h3, h4, [class*="title"], [class*="Title"], [class*="name"], [class*="Name"]');
        const title = titleEl ? titleEl.textContent.trim() : '';
        
        if (!title || title.length < 5) return;
        
        // Extract date
        let dateText = '';
        const dateEl = card.querySelector('[datetime], time, [class*="date"], [class*="Date"]');
        if (dateEl) {
          dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
        }
        
        // If no date element, try to find date in text
        if (!dateText) {
          const text = card.textContent;
          const dateMatch = text.match(/(?:MON|TUE|WED|THU|FRI|SAT|SUN),?\\s+\\d{1,2}\\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i);
          if (dateMatch) {
            dateText = dateMatch[0];
          }
        }
        
        if (!dateText || dateText.length < 4) return;
        
        // Extract lineup/artists
        const artistsEl = card.querySelector('[class*="lineup"], [class*="artist"]');
        const artists = artistsEl ? artistsEl.textContent.trim() : '';
        
        // Extract URL
        const linkEl = card.querySelector('a[href*="/events/"]');
        const url = linkEl ? linkEl.href : '';
        
        eventElements.push({
          title: title,
          dateText: dateText,
          description: artists || title,
          url: url
        });
      });
      
      return eventElements;
    });
    
    console.log(\`   🌙 Extracted \${scrapedEvents.length} events from RA\`);
    
    // Process events
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
        category: 'Nightlife',
        source: 'Resident Advisor (Puppeteer)'
      });
    }
    
  } catch (error) {
    if (error.message.includes('net::ERR_NAME_NOT_RESOLVED') || 
        error.message.includes('net::ERR_CONNECTION_REFUSED') ||
        error.message.includes('Navigation timeout')) {
      console.log(\`   ⚠️  0 events (site unavailable)\`);
      return filterEvents([]);
    }
    console.log(\`   ⚠️  Error: \${error.message.substring(0, 50)}...\`);
    return filterEvents([]);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return filterEvents(events);
}

module.exports = PLACEHOLDER_FUNC;
`;

async function createRAPuppeteerScrapers() {
  const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
  let createdCount = 0;
  
  console.log('🚀 Creating Puppeteer scrapers for Resident Advisor venues...\n');
  
  for (const venue of raVenues) {
    try {
      const filepath = path.join(scrapersDir, venue.file);
      
      let content = puppeteerTemplate;
      content = content.replace(/PLACEHOLDER_URL/g, venue.url);
      content = content.replace(/PLACEHOLDER_NAME/g, venue.name);
      content = content.replace(/PLACEHOLDER_ADDRESS/g, venue.address);
      content = content.replace(/PLACEHOLDER_FUNC/g, venue.func);
      
      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`✅ ${venue.name}`);
      console.log(`   🔗 ${venue.url}`);
      console.log(`   🤖 Using Puppeteer for JavaScript rendering`);
      createdCount++;
    } catch (error) {
      console.log(`❌ ${venue.name}: ${error.message}`);
    }
  }
  
  console.log(`\n🎯 Created ${createdCount}/${raVenues.length} Puppeteer RA scrapers`);
  console.log(`\n💡 These will now see JavaScript-rendered events!`);
}

createRAPuppeteerScrapers();
