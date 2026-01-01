/**
 * Westgate Las Vegas Resort Entertainment Scraper
 * URL: https://www.westgateresorts.com/hotels/nevada/las-vegas/westgate-las-vegas-resort-casino/entertainment
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeWestgate(city = 'Las Vegas') {
  console.log('🏨 Scraping Westgate...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.westgateresorts.com/hotels/nevada/las-vegas/westgate-las-vegas-resort-casino/entertainment', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event"], a[href*="/show"]').forEach(el => {
        const href = el.href;
        if (seen.has(href)) return;
        seen.add(href);
        
        let container = el;
        for (let i = 0; i < 5; i++) {
          container = container.parentElement;
          if (!container) break;
        }
        
        const title = container?.querySelector('h2, h3, h4, .title, .headliners')?.textContent?.trim()?.replace(/\s+/g, ' ');
        const allText = container?.textContent || '';
        const dateMatch = allText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
        const dateStr = dateMatch ? dateMatch[0] : null;
        const img = container?.querySelector('img')?.src;
        
        if (title && title.length > 3 && title.length < 100) {
          results.push({ title, dateStr, url: href, imageUrl: img });
        }
      });
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const seenKeys = new Set();
    const now = new Date();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
          const day = dateMatch[2].padStart(2, '0');
          let year = now.getFullYear().toString();
          if (parseInt(month) < now.getMonth() + 1) {
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
          name: 'Westgate Las Vegas',
          address: '3000 Paradise Rd, Las Vegas, NV 89109',
          city: 'Las Vegas'
        },
        latitude: 36.1365,
        longitude: -115.1533,
        city: 'Las Vegas',
        category: 'Nightlife',
        source: 'Westgate'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Westgate events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Westgate error:', error.message);
    return [];
  }
}

module.exports = scrapeWestgate;
