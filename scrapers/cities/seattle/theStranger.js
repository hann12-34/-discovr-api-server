/**
 * The Stranger Events Scraper - REAL Puppeteer
 * Seattle's premier alternative events calendar
 * URL: https://www.thestranger.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTheStranger(city = 'Seattle') {
  console.log('📰 Scraping The Stranger Events...');

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

    // Scrape multiple categories
    const urls = [
      'https://www.thestranger.com/events/music',
      'https://www.thestranger.com/events/clubs',
      'https://www.thestranger.com/events/performance'
    ];

    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Scroll to load more
        for (let i = 0; i < 2; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const events = await page.evaluate(() => {
          const results = [];
          const seen = new Set();
          // NO new Date() - year must come from page
          const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };

          const items = document.querySelectorAll('.event-row, .event-listing, article, [class*="event"], .listing');
          
          items.forEach(item => {
            const text = item.innerText;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            let title = null;
            let venue = null;
            for (const line of lines) {
              if (line.length > 5 && line.length < 100 && 
                  !line.match(/^(read more|share|free|\$|view|seattle|tonight|tomorrow)/i)) {
                if (!title) {
                  title = line;
                } else if (!venue && line.length > 3 && !line.match(/^\d/) && !line.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
                  // Second valid line might be venue
                  venue = line;
                }
              }
            }
            
            const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i)
              || text.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/i);
            
            if (title && dateMatch) {
              let monthStr, day, year;
              if (dateMatch[0].match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i)) {
                if (!dateMatch[4]) return; // Skip if no year
                monthStr = dateMatch[2].toLowerCase().slice(0, 3);
                day = dateMatch[3];
                year = dateMatch[4];
              } else {
                if (!dateMatch[3]) return; // Skip if no year
                monthStr = dateMatch[1].toLowerCase().slice(0, 3);
                day = dateMatch[2];
                year = dateMatch[3];
              }
              
              const month = months[monthStr];
              if (month && venue) {  // Only include events with venue
                const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
                if (!seen.has(title + isoDate)) {
                  seen.add(title + isoDate);
                  results.push({ title: title.substring(0, 100), date: isoDate, venue: venue.substring(0, 80) });
                }
              }
            }
          });
          
          return results;
        });

        allEvents.push(...events);
        console.log(`   ${url.split('/').pop()}: ${events.length} events`);
      } catch (err) {
        console.log(`   ⚠️ ${url.split('/').pop()}: ${err.message.substring(0, 40)}`);
      }
    }

    await browser.close();

    // Dedupe
    const seen = new Set();
    const uniqueEvents = allEvents.filter(e => {
      const key = e.title + e.date;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log(`  ✅ Found ${uniqueEvents.length} The Stranger events`);

    const formattedEvents = uniqueEvents.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
      url: 'https://www.thestranger.com/events/',
      imageUrl: null,
      venue: { name: event.venue, address: 'Seattle, WA', city: 'Seattle' },
      latitude: 47.6062,
      longitude: -122.3321,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'TheStranger'
    }));

    formattedEvents.slice(0, 15).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  The Stranger error:', error.message);
    return [];
  }
}

module.exports = scrapeTheStranger;
