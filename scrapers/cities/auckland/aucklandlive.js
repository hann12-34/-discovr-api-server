/**
 * Auckland Live Events Scraper
 * Major performing arts venues in Auckland
 * URL: https://www.aucklandlive.co.nz/whats-on
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeAucklandLive(city = 'Auckland') {
  console.log('🎭 Scraping Auckland Live...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.aucklandlive.co.nz/whats-on', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/show/"], a[href*="/event/"]').forEach(el => {
        const href = el.href;
        if (seen.has(href)) return;
        seen.add(href);
        
        let container = el;
        for (let i = 0; i < 6; i++) {
          container = container.parentElement;
          if (!container) break;
          
          const title = container.querySelector('h2, h3, h4, .title, [class*="title"]')?.textContent?.trim()?.replace(/\s+/g, ' ');
          const dateEl = container.querySelector('time, .date, [class*="date"]');
          const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
          const img = container.querySelector('img')?.src;
          
          if (title && title.length > 3 && title.length < 100) {
            results.push({ title, dateStr, url: href, imageUrl: img });
            break;
          }
        }
      });
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        // Handle formats like "16 Jan - 17 Jan 2026" or "21 Jan 2026"
        const dateMatch = event.dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:-[^0-9]*)?(\d{4})?/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const now = new Date();
          let year = dateMatch[3] || now.getFullYear().toString();
          if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Auckland Live',
          address: 'Aotea Centre, 50 Mayoral Drive, Auckland CBD',
          city: 'Auckland'
        },
        latitude: -36.8523,
        longitude: 174.7630,
        city: 'Auckland',
        category: 'Nightlife',
        source: 'Auckland Live'
      });
    }

    // Remove duplicates
    const uniqueEvents = [];
    const seenKeys = new Set();
    for (const e of formattedEvents) {
      const key = e.title + e.date;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueEvents.push(e);
      }
    }

    console.log(`  ✅ Found ${uniqueEvents.length} valid Auckland Live events`);
    return uniqueEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Auckland Live error:', error.message);
    return [];
  }
}

module.exports = scrapeAucklandLive;
