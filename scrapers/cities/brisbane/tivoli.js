/**
 * The Tivoli Brisbane Events Scraper
 * Major live music venue in Brisbane
 * URL: https://www.thetivoli.com.au/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeTivoli(city = 'Brisbane') {
  console.log('🎸 Scraping The Tivoli Brisbane...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.thetivoli.com.au/events', {
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
          
          const title = container.querySelector('h2, h3, h4, .title')?.textContent?.trim()?.replace(/\s+/g, ' ');
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'The Tivoli',
          address: '52 Costin St, Fortitude Valley QLD 4006',
          city: 'Brisbane'
        },
        latitude: -27.4575,
        longitude: 153.0322,
        city: 'Brisbane',
        category: 'Nightlife',
        source: 'The Tivoli'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Tivoli events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Tivoli error:', error.message);
    return [];
  }
}

module.exports = scrapeTivoli;
