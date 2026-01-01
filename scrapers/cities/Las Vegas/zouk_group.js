/**
 * Zouk Group Las Vegas Events Scraper
 * Scrapes events from Zouk Nightclub and Ayu Dayclub at Resorts World
 * URL: https://zoukgrouplv.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const VENUE_INFO = {
  zouk: {
    name: 'Zouk Nightclub',
    address: '3000 S Las Vegas Blvd, Las Vegas, NV 89109',
    latitude: 36.1215,
    longitude: -115.1689
  },
  ayu: {
    name: 'Ayu Dayclub',
    address: '3000 S Las Vegas Blvd, Las Vegas, NV 89109',
    latitude: 36.1215,
    longitude: -115.1689
  }
};

async function scrapeZoukGroup(city = 'Las Vegas') {
  console.log('🎧 Scraping Zouk Group Las Vegas (Zouk Nightclub + Ayu Dayclub)...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Go to events page
    await page.goto('https://zoukgrouplv.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for events to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Scroll to load more events
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 1000);
        await new Promise(r => setTimeout(r, 500));
      }
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];
      const seenEvents = new Set();

      // Look for event cards/items
      const eventElements = document.querySelectorAll('[class*="event"], .uv-event-item, .event-card, article');

      eventElements.forEach(el => {
        try {
          // Get title
          const titleEl = el.querySelector('h2, h3, h4, .event-title, [class*="title"], .uv-event-title');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          if (!title || title.length < 3) return;

          // Get event URL
          const linkEl = el.querySelector('a[href*="/events/"], a[href*="event"]');
          const url = linkEl ? linkEl.href : '';
          
          // Skip if no URL (required per rules)
          if (!url) return;

          // Get image
          const imgEl = el.querySelector('img[src]:not([src*="logo"]):not([src*="icon"])');
          let imageUrl = imgEl ? (imgEl.src || imgEl.dataset.src) : null;
          
          // Skip placeholder/default images
          if (imageUrl && (imageUrl.includes('placeholder') || imageUrl.includes('default'))) {
            imageUrl = null;
          }

          // Get date
          let dateStr = '';
          const dateEl = el.querySelector('[class*="date"], time, .event-date');
          if (dateEl) {
            dateStr = dateEl.textContent.trim() || dateEl.getAttribute('datetime') || '';
          }

          // Get venue name from the event
          let venueName = '';
          const venueEl = el.querySelector('[class*="venue"], .location, .event-venue');
          if (venueEl) {
            venueName = venueEl.textContent.trim().toLowerCase();
          }

          // Determine venue type from title or venue text
          let venueType = 'zouk'; // default
          const fullText = (title + ' ' + venueName).toLowerCase();
          if (fullText.includes('ayu') || fullText.includes('dayclub') || fullText.includes('pool')) {
            venueType = 'ayu';
          }

          // Create unique key to avoid duplicates
          const eventKey = `${title}-${dateStr}`;
          if (seenEvents.has(eventKey)) return;
          seenEvents.add(eventKey);

          results.push({
            title,
            url,
            imageUrl,
            dateStr,
            venueType
          });
        } catch (e) {
          // Skip problematic elements
        }
      });

      return results;
    });

    await browser.close();
    console.log(`  📋 Found ${events.length} raw events from Zouk Group`);

    // Process and format events
    const formattedEvents = [];
    const now = new Date();

    for (const event of events) {
      // Skip if no URL (required)
      if (!event.url) continue;

      // Parse date
      let eventDate = parseEventDate(event.dateStr);
      if (!eventDate || eventDate < now) continue;

      const venue = VENUE_INFO[event.venueType] || VENUE_INFO.zouk;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        url: event.url,
        imageUrl: event.imageUrl || null,
        venue: {
          name: venue.name,
          address: venue.address,
          city: city
        },
        latitude: venue.latitude,
        longitude: venue.longitude,
        city: city,
        category: 'Nightlife',
        source: 'Zouk Group LV'
      });
    }

    console.log(`  ✅ Processed ${formattedEvents.length} valid Zouk Group events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ Zouk Group error:', error.message);
    return [];
  }
}

function parseEventDate(dateStr) {
  if (!dateStr) return null;

  const months = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };

  try {
    // Try ISO format first
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(dateStr);
    }

    // Try "Month Day" format (e.g., "Jan 15" or "January 15")
    const monthDayMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2})/i);
    if (monthDayMatch) {
      const monthStr = monthDayMatch[1].toLowerCase().substring(0, 3);
      const day = parseInt(monthDayMatch[2]);
      const month = months[monthStr];
      
      if (month !== undefined) {
        const now = new Date();
        let year = now.getFullYear();
        
        // If the date has passed this year, use next year
        const testDate = new Date(year, month, day, 22, 0, 0);
        if (testDate < now) {
          year++;
        }
        
        return new Date(year, month, day, 22, 0, 0);
      }
    }

    // Try "MM/DD" or "MM/DD/YYYY" format
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1]) - 1;
      const day = parseInt(slashMatch[2]);
      let year = slashMatch[3] ? parseInt(slashMatch[3]) : new Date().getFullYear();
      if (year < 100) year += 2000;
      
      return new Date(year, month, day, 22, 0, 0);
    }

  } catch (e) {
    return null;
  }

  return null;
}

module.exports = scrapeZoukGroup;
