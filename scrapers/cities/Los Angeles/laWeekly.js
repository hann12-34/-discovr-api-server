/**
 * LA Weekly Events Scraper - REAL Puppeteer
 * Local LA events aggregator
 * URL: https://www.laweekly.com/event-listings/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeLAWeekly(city = 'Los Angeles') {
  console.log('📰 Scraping LA Weekly Events...');

  let browser;
  const allEvents = [];
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.laweekly.com/event-listings/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };

      const items = document.querySelectorAll('article, .event-item, .listing-item, [class*="event"]');
      
      items.forEach(item => {
        const text = item.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let title = null;
        for (const line of lines) {
          if (line.length > 5 && line.length < 100 && !line.match(/^(read more|share|comment|free|\$)/i)) {
            title = line;
            break;
          }
        }
        
        const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i);
        
        if (title && dateMatch) {
          const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
          const day = dateMatch[2];
          const year = dateMatch[3] || currentYear;
          const month = months[monthStr];
          
          if (month) {
            const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
            if (!seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              results.push({ title: title.substring(0, 100), date: isoDate });
            }
          }
        }
      });
      
      return results;
    });

    allEvents.push(...events);
    await browser.close();
    
    console.log(`  ✅ Found ${allEvents.length} LA Weekly events`);

    const formattedEvents = allEvents.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
      url: 'https://www.laweekly.com/event-listings/',
      imageUrl: null,
      venue: { name: 'Various LA Venues', address: 'Los Angeles, CA', city: 'Los Angeles' },
      latitude: 34.0522,
      longitude: -118.2437,
      city: 'Los Angeles',
      category: 'Nightlife',
      source: 'LAWeekly'
    }));

    formattedEvents.slice(0, 15).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    if (formattedEvents.length > 15) console.log(`  ... and ${formattedEvents.length - 15} more`);
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  LA Weekly error:', error.message);
    return [];
  }
}

module.exports = scrapeLAWeekly;
