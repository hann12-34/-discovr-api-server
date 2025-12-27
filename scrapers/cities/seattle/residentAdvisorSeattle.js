/**
 * Resident Advisor Seattle Scraper - REAL Puppeteer
 * Premier source for electronic music & club events
 * URL: https://ra.co/events/us/seattle
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

// Venues that have dedicated scrapers - exclude from RA to avoid duplicates
const EXCLUDED_VENUES = [
  'showbox', 'neumos', 'kremwerk', 'nectar lounge', 'tractor tavern',
  'chop suey', 'trinity nightclub', 'ora nightclub', 'clock out',
  'conor byrne', 'crocodile', 'barboza', 'climate pledge', 'neptune',
  'foundation nightclub', 'high dive', 'vera project', 'q nightclub'
];

async function scrapeResidentAdvisorSeattle(city = 'Seattle') {
  console.log('🎧 Scraping Resident Advisor Seattle...');

  let browser;
  const allEvents = [];
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 180000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://ra.co/events/us/seattle', {
      waitUntil: 'networkidle2',
      timeout: 90000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      // NO new Date() - year must come from page
      const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };

      const eventItems = document.querySelectorAll('[data-testid="event-item"], li[class*="event"], article, [class*="EventCard"]');
      
      eventItems.forEach(item => {
        const text = item.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let title = null;
        for (const line of lines) {
          if (line.length > 3 && line.length < 100 && 
              !line.match(/^(free|from|\$|going|interested|share)/i) &&
              !line.match(/^\d{1,2}:\d{2}/) &&
              !line.match(/^(mon|tue|wed|thu|fri|sat|sun)/i)) {
            title = line;
            break;
          }
        }
        
        const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i)
          || text.match(/(\d{1,2})[\s]+(?:st|nd|rd|th)?[\s]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*(\d{4})?/i);
        
        if (title && dateMatch && dateMatch[3]) {
          let monthStr, day, year;
          if (dateMatch[1].match(/\d/)) {
            day = dateMatch[1];
            monthStr = dateMatch[2].toLowerCase().slice(0, 3);
            year = dateMatch[3];
          } else {
            monthStr = dateMatch[1].toLowerCase().slice(0, 3);
            day = dateMatch[2];
            year = dateMatch[3];
          }
          
          const month = months[monthStr];
          if (month) {
            const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
            if (!seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              const venueMatch = text.match(/at\s+([^,\n]+)/i) || text.match(/venue:\s*([^\n]+)/i);
              // Skip events without proper venue info
              if (!venueMatch) return;
              const venue = venueMatch[1].trim();
              if (venue.length < 3) return;
              results.push({ title: title.substring(0, 100), date: isoDate, venue: venue.substring(0, 80) });
            }
          }
        }
      });
      
      return results;
    });

    // Filter out events from venues that have dedicated scrapers
    const filteredEvents = events.filter(event => {
      const venueLower = (event.venue || '').toLowerCase();
      const titleLower = (event.title || '').toLowerCase();
      for (const excluded of EXCLUDED_VENUES) {
        if (venueLower.includes(excluded) || titleLower.includes(excluded)) {
          return false;
        }
      }
      return true;
    });
    
    allEvents.push(...filteredEvents);
    await browser.close();
    
    console.log(`  ✅ Found ${filteredEvents.length} RA events (excluded ${events.length - filteredEvents.length} from venues with dedicated scrapers)`);

    const formattedEvents = allEvents.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T22:00:00') : null,
      url: 'https://ra.co/events/us/seattle',
      imageUrl: null,
      venue: { name: event.venue, address: 'Seattle, WA', city: 'Seattle' },
      latitude: 47.6062,
      longitude: -122.3321,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'ResidentAdvisorSeattle'
    }));

    formattedEvents.slice(0, 20).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    if (formattedEvents.length > 20) console.log(`  ... and ${formattedEvents.length - 20} more`);
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Resident Advisor Seattle error:', error.message);
    return [];
  }
}

module.exports = scrapeResidentAdvisorSeattle;
