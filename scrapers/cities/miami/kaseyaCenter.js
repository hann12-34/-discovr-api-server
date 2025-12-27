/**
 * Kaseya Center Events Scraper (Miami)
 * Miami's major arena - concerts, sports, shows
 * URL: https://www.kaseyacenter.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeKaseyaCenter(city = 'Miami') {
  console.log('🏟️  Scraping Kaseya Center Miami...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.kaseyacenter.com/events', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Scroll to load more events
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Get all event links and images from the page
    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      
      // Find event cards/containers
      const containers = document.querySelectorAll('a[href*="/event/"], .event-card, [class*="event"]');
      
      containers.forEach(container => {
        const text = container.innerText || '';
        
        // Get image
        const img = container.querySelector('img');
        let imageUrl = img?.src || null;
        if (imageUrl && (imageUrl.includes('logo') || imageUrl.includes('icon'))) imageUrl = null;
        
        // Get event URL
        const link = container.tagName === 'A' ? container.href : container.querySelector('a')?.href;
        
        // Parse date
        const datePattern = /(?:MON|TUE|WED|THU|FRI|SAT|SUN)\.\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2}),\s+(\d{4})/i;
        const dateMatch = text.match(datePattern);
        
        if (!dateMatch) return;
        
        const monthStr = dateMatch[1].toUpperCase();
        const day = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3];
        const month = months[monthStr];
        const isoDate = `${year}-${month}-${day}`;
        
        // Get title - find substantial text
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        let title = null;
        for (const line of lines) {
          if (line.length > 5 && line.length < 100 &&
              !line.match(/^(MON|TUE|WED|THU|FRI|SAT|SUN)\./i) &&
              !line.match(/^(BUY TICKETS|MORE INFO|ALL-ACCESS)/i) &&
              !line.includes('Kaseya Center')) {
            title = line;
            break;
          }
        }
        
        if (title && !seen.has(title + isoDate)) {
          seen.add(title + isoDate);
          results.push({ title, date: isoDate, imageUrl, eventUrl: link });
        }
      });
      
      return results;
    });

    // Fetch images from event pages if missing
    for (const event of events) {
      if (!event.imageUrl && event.eventUrl) {
        try {
          await page.goto(event.eventUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await new Promise(r => setTimeout(r, 1500));
          const img = await page.evaluate(() => {
            const og = document.querySelector('meta[property="og:image"]');
            return og?.content || null;
          });
          if (img) event.imageUrl = img;
        } catch (e) {}
      }
    }

    await browser.close();

    console.log(`  ✅ Found ${events.length} Kaseya Center events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: event.eventUrl || 'https://www.kaseyacenter.com/events',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'Kaseya Center',
        address: '601 Biscayne Blvd, Miami, FL 33132',
        city: 'Miami'
      },
      latitude: 25.7814,
      longitude: -80.1870,
      city: 'Miami',
      category: 'Nightlife',
      source: 'Kaseya Center'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Kaseya Center error:', error.message);
    return [];
  }
}

module.exports = scrapeKaseyaCenter;
