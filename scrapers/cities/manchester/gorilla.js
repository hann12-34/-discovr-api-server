/**
 * Gorilla Manchester Events Scraper
 * Live music venue and bar - Uses Fatso.ma platform
 * URL: https://www.thisisgorilla.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeGorilla(city = 'Manchester') {
  console.log('🦍 Scraping Gorilla Manchester...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-GB,en;q=0.9' });

    // Gorilla homepage has events displayed
    await page.goto('https://www.thisisgorilla.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 6000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Fatso.ma platform uses various event grid classes
      document.querySelectorAll('[class*="event"], .event-card, article, a[href*="/event/"]').forEach(item => {
        try {
          const linkEl = item.tagName === 'A' ? item : item.querySelector('a[href*="/event/"]');
          const url = linkEl?.href;
          if (!url || seen.has(url) || !url.includes('/event/')) return;
          seen.add(url);
          
          const container = item.closest('[class*="event"]') || item;
          
          // Get title
          const titleEl = container.querySelector('h2, h3, h4, [class*="title"], [class*="name"], .heading');
          let title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!title || title.length < 3) return;
          
          // Get date
          const dateEl = container.querySelector('time, [class*="date"], [datetime]');
          const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
          
          // Get image
          const imgEl = container.querySelector('img');
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
          
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
        description: event.description || `Live at Gorilla Manchester`,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Gorilla',
          address: '54-56 Whitworth Street West, Manchester M1 5WW',
          city: 'Manchester'
        },
        latitude: 53.4746,
        longitude: -2.2497,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'Gorilla'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Gorilla events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Gorilla error:', error.message);
    return [];
  }
}

module.exports = scrapeGorilla;
