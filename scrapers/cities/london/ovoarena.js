/**
 * OVO Arena Wembley Events Scraper
 * Major arena venue in London
 * URL: https://www.ovoarena.co.uk/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeOVOArena(city = 'London') {
  console.log('🏟️ Scraping OVO Arena Wembley...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.ovoarena.co.uk/events', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event"]').forEach(el => {
        const href = el.href;
        if (seen.has(href) || href.endsWith('/events') || href.endsWith('/events/')) return;
        seen.add(href);
        
        let container = el;
        for (let i = 0; i < 6; i++) {
          container = container.parentElement;
          if (!container) break;
          
          const title = container.querySelector('h2, h3, h4, .title, .event-title')?.textContent?.trim()?.replace(/\s+/g, ' ');
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
    const seenKeys = new Set();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const yearMatch = event.dateStr.match(/(\d{4})/);
        const foundYear = yearMatch ? yearMatch[1] : null;
        
        const dateMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) ||
                         event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
        
        if (dateMatch) {
          let day, month;
          if (dateMatch[1].match(/\d/)) {
            day = dateMatch[1].padStart(2, '0');
            month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          } else {
            month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            day = dateMatch[2].padStart(2, '0');
          }
          const now = new Date();
          let year = foundYear || now.getFullYear().toString();
          if (!foundYear && parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      const key = event.title + isoDate;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('logo')) ? event.imageUrl : null,
        venue: {
          name: 'OVO Arena Wembley',
          address: 'Arena Square, Engineers Way, London HA9 0AA',
          city: 'London'
        },
        latitude: 51.5560,
        longitude: -0.2795,
        city: 'London',
        category: 'Nightlife',
        source: 'OVO Arena Wembley'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid OVO Arena events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  OVO Arena error:', error.message);
    return [];
  }
}

module.exports = scrapeOVOArena;
