/**
 * Astor Theatre Perth Events Scraper
 * Historic theatre venue
 * URL: https://astortheatreperth.com/event/events-by-month/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeAstorTheatre(city = 'Perth') {
  console.log('🎭 Scraping Astor Theatre Perth...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://astortheatreperth.com/event/events-by-month/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Scroll to load more events
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 2000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Look for event links with dates
      document.querySelectorAll('a[href*="/events/"]').forEach(el => {
        try {
          const url = el.href;
          if (!url || seen.has(url)) return;
          
          const title = el.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title.length > 150) return;
          if (title === 'More info...' || title === 'Buy Tickets') return;
          
          seen.add(url);
          
          // Find parent container with date
          let container = el.closest('div, li, article');
          for (let i = 0; i < 5 && container; i++) {
            if (container.textContent?.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
              break;
            }
            container = container.parentElement;
          }
          
          // Extract date
          let dateStr = null;
          const text = container?.textContent || '';
          const dateMatch = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
          if (dateMatch) {
            dateStr = dateMatch[0];
          }
          
          // Get image
          const img = container?.querySelector('img');
          const imageUrl = img?.src;
          
          results.push({ title, dateStr, url, imageUrl });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const dateMatch = event.dateStr.match(/(\d{1,2})[\/\.\s]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\.\s]*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            const year = dateMatch[3] || new Date().getFullYear().toString();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: event.description || `Live at Astor Theatre Perth`,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Astor Theatre',
          address: '659 Beaufort Street, Mount Lawley WA 6050',
          city: 'Perth'
        },
        latitude: -31.9316,
        longitude: 115.8787,
        city: 'Perth',
        category: 'Nightlife',
        source: 'Astor Theatre'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Astor Theatre events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Astor Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeAstorTheatre;
