/**
 * Starlite Room Edmonton Events Scraper
 * Live music venue
 * URL: https://www.starliteroom.ca/calendar
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeStarliteRoom(city = 'Edmonton') {
  console.log('🎸 Scraping Starlite Room Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Get event URLs from calendar
    await page.goto('https://www.starliteroom.ca/calendar', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events directly from calendar page
    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Get all tm-event links
      document.querySelectorAll('a').forEach(link => {
        const url = link.href;
        if (!url || !url.includes('/tm-event/') || seen.has(url)) return;
        seen.add(url);
        
        // Extract title from URL slug
        const slug = url.split('/tm-event/')[1]?.replace(/\/$/, '');
        if (!slug) return;
        const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        results.push({ title, url, dateText: '', imageUrl: null });
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();

    for (const event of events) {
      let isoDate = null;
      
      if (event.dateText) {
        // Try ISO format first
        const isoMatch = event.dateText.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          isoDate = isoMatch[1];
        } else {
          // Try month day year format
          const dateMatch = event.dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
          if (dateMatch) {
            const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            const day = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3] || now.getFullYear();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      // No fallback dates - rule #4
      if (!isoDate) continue;
      
      if (new Date(isoDate) < now) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Starlite Room',
          address: '10030 102 Street NW, Edmonton, AB T5J 0V6',
          city: 'Edmonton'
        },
        latitude: 53.5434,
        longitude: -113.4962,
        city: 'Edmonton',
        category: 'Nightlife',
        source: 'Starlite Room'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Starlite Room events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Starlite Room error:', error.message);
    return [];
  }
}

module.exports = scrapeStarliteRoom;
