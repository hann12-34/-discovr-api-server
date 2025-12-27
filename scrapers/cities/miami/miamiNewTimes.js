/**
 * Miami New Times Events Scraper - REAL Puppeteer
 * Local Miami events aggregator
 * URL: https://www.miaminewtimes.com/calendar
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeMiamiNewTimes(city = 'Miami') {
  console.log('📰 Scraping Miami New Times Events...');

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

    await page.goto('https://www.miaminewtimes.com/calendar', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll to load more
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };

      const items = document.querySelectorAll('.event-row, .calendar-event, article, [class*="event"]');
      
      items.forEach(item => {
        const text = item.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let title = null;
        let venue = null;
        for (const line of lines) {
          // Skip date/time strings, navigation items, addresses, and generic text
          if (line.length > 12 && line.length < 100 && 
              !line.match(/^(read more|share|free|\$|view|miami|sun\.|mon\.|tue\.|wed\.|thu\.|fri\.|sat\.)/i) &&
              !line.match(/^\d{1,2}:\d{2}\s*(am|pm)?$/i) &&
              !line.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) &&
              !line.match(/^\d+\s+(N|S|E|W|NE|NW|SE|SW)?\s*\w+\s+(St|Ave|Blvd|Rd|Dr|Ln|Way|Ct)/i) &&
              !line.match(/^(hard rock|kaseya|neighborhood)/i) &&
              !line.match(/Biscayne|Blvd\.|Downtown/i)) {
            if (!title) {
              title = line;
            } else if (!venue && line.length > 3 && !line.match(/^\d/)) {
              // Second valid line might be venue - but not if it starts with number (address)
              venue = line;
            }
          }
        }
        
        const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i)
          || text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        
        if (title && dateMatch) {
          let isoDate;
          if (dateMatch[0].includes('/')) {
            const month = dateMatch[1].padStart(2, '0');
            const day = dateMatch[2].padStart(2, '0');
            let year = dateMatch[3];
            if (year.length === 2) year = '20' + year;
            isoDate = `${year}-${month}-${day}`;
          } else {
            const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
            const day = dateMatch[2];
            const year = dateMatch[3] || currentYear;
            const month = months[monthStr];
            if (month) isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
          }
          
          // Only include if we have a valid title (not a date/time)
          if (isoDate && title && !seen.has(title + isoDate) && 
              !title.match(/^\d/) && title.length > 10) {
            seen.add(title + isoDate);
            results.push({ title: title.substring(0, 100), date: isoDate, venue: venue });
          }
        }
      });
      
      return results;
    });

    allEvents.push(...events);
    await browser.close();
    
    console.log(`  ✅ Found ${allEvents.length} Miami New Times events`);

    // Filter out events without proper venue info
    const validEvents = allEvents.filter(e => e.venue && e.venue.length > 3);
    console.log(`  📍 ${validEvents.length} events have venue info (filtered ${allEvents.length - validEvents.length} without)`);
    
    const formattedEvents = validEvents.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
      url: 'https://www.miaminewtimes.com/calendar',
      imageUrl: null,
      venue: { name: event.venue, address: 'Miami, FL', city: 'Miami' },
      latitude: 25.7617,
      longitude: -80.1918,
      city: 'Miami',
      category: 'Nightlife',
      source: 'MiamiNewTimes'
    }));

    formattedEvents.slice(0, 15).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Miami New Times error:', error.message);
    return [];
  }
}

module.exports = scrapeMiamiNewTimes;
