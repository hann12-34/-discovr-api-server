const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { parseDateText } = require('../../utils/city-util');
const { filterEvents } = require('../../utils/eventFilter');

const EVENTS_URL = 'https://ra.co/clubs/69282/events';
const VENUE_NAME = 'Bambi';
const VENUE_ADDRESS = '1265 Dundas St W, Toronto, ON M6J 1X8';

async function bambinightclubEvents(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
  }
  
  console.log(`🌙 Scraping ${VENUE_NAME} nightlife events (Puppeteer) for ${city}...`);
  
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
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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
          const dateMatch = text.match(/(?:MON|TUE|WED|THU|FRI|SAT|SUN),?\s+\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i);
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
    
    console.log(`   🌙 Extracted ${scrapedEvents.length} events from RA`);
    
    // Process events
    for (const evt of scrapedEvents) {
      // Add year to RA dates (they come as "Sat, 1 Nov" without year)
      let dateText = evt.dateText;
      if (dateText.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i)) {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        const month = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)[0];
        const currentMonth = new Date().getMonth();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const eventMonth = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
        
        // If event month is before current month, it's next year
        dateText = eventMonth < currentMonth ? `${dateText} ${nextYear}` : `${dateText} ${currentYear}`;
      }
      
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) {
        continue;
      }
      
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
      console.log(`   ⚠️  0 events (site unavailable)`);
      return filterEvents([]);
    }
    console.log(`   ⚠️  Error: ${error.message.substring(0, 50)}...`);
    return filterEvents([]);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return filterEvents(events);
}

module.exports = bambinightclubEvents;
