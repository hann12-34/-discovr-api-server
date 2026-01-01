/**
 * Victoria Warehouse Manchester Events Scraper v2
 * URL: https://victoriawarehouse.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeVictoriaWarehouse2(city = 'Manchester') {
  console.log('🎭 Scraping Victoria Warehouse v2...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://victoriawarehouse.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event"], .event, article').forEach(el => {
        const link = el.tagName === 'A' ? el : el.querySelector('a');
        if (!link) return;
        const href = link.href;
        if (seen.has(href)) return;
        seen.add(href);
        
        const container = el.closest('article') || el;
        const title = container.querySelector('h2, h3, h4, .title')?.textContent?.trim()?.replace(/\s+/g, ' ');
        const dateEl = container.querySelector('time, .date');
        const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
        const img = container.querySelector('img')?.src;
        
        if (title && title.length > 3 && title.length < 100) {
          results.push({ title, dateStr, url: href, imageUrl: img });
        }
      });
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          let year = now.getFullYear().toString();
          if (parseInt(month) < now.getMonth() + 1) year = (now.getFullYear() + 1).toString();
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Victoria Warehouse',
          address: 'Trafford Wharf Rd, Manchester M17 1AB',
          city: 'Manchester'
        },
        latitude: 53.4670,
        longitude: -2.2890,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'Victoria Warehouse'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Victoria Warehouse v2 events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Victoria Warehouse v2 error:', error.message);
    return [];
  }
}

module.exports = scrapeVictoriaWarehouse2;
