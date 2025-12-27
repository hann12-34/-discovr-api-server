/**
 * El Corazon Scraper - REAL Puppeteer
 * Live music venue in Seattle
 * URL: https://www.elcorazonseattle.com/calendar
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeElCorazon(city = 'Seattle') {
  console.log('🎸 Scraping El Corazon...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.elcorazonseattle.com/calendar', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll to load more events
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };

      // Find event cards/items
      const eventItems = document.querySelectorAll('.eventItem, .event-item, article, [class*="event"], .tw-eventContainer');
      
      eventItems.forEach(item => {
        try {
          const text = item.innerText;
          
          // Get title
          const titleEl = item.querySelector('h2, h3, h4, .title, .event-title, .tw-name a');
          let title = titleEl ? titleEl.textContent.trim() : null;
          
          if (!title || title.length < 3) return;
          
          // Get date - look for pattern like "Dec 19" or "December 19, 2025"
          const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i);
          if (!dateMatch) return;
          
          const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
          const day = dateMatch[2].padStart(2, '0');
          const month = months[monthStr];
          
          // Look for year on page - NO FALLBACK
          const yearMatch = text.match(/\b(202[4-9])\b/) || document.body.innerText.match(/\b(202[4-9])\b/);
          if (!yearMatch) return;
          const year = yearMatch[1];
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Get image
          const img = item.querySelector('img:not([src*="logo"]):not([alt*="logo"])');
          const imageUrl = img ? (img.src || img.getAttribute('data-src')) : null;
          
          // Get event URL
          const link = item.querySelector('a[href*="event"], a[href*="calendar"]');
          const eventUrl = link ? link.href : 'https://www.elcorazonseattle.com/calendar';
          
          const key = title + isoDate;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              title: title.substring(0, 100),
              date: isoDate,
              imageUrl: imageUrl,
              url: eventUrl
            });
          }
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} El Corazon events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
      url: event.url,
      imageUrl: event.imageUrl,
      venue: {
        name: 'El Corazon',
        address: '109 Eastlake Ave E, Seattle, WA 98109',
        city: 'Seattle'
      },
      latitude: 47.6205,
      longitude: -122.3267,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'ElCorazon'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date} ${e.imageUrl ? '🖼️' : ''}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  El Corazon error:', error.message);
    return [];
  }
}

module.exports = scrapeElCorazon;
