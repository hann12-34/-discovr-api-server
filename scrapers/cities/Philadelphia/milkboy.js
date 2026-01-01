/**
 * MilkBoy Philadelphia Events Scraper
 * Music venue and bar
 * URL: https://www.milkboyphilly.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeMilkBoy(city = 'Philadelphia') {
  console.log('🎸 Scraping MilkBoy Philadelphia...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.milkboyphilly.com/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.event, .show, article, .eventlist-event').forEach(el => {
        const titleEl = el.querySelector('h2, h3, h4, .event-title, .title');
        const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
        
        const linkEl = el.querySelector('a[href*="event"], a');
        const href = linkEl?.href;
        
        const dateEl = el.querySelector('time, .event-date, .date');
        const dateAttr = dateEl?.getAttribute('datetime');
        const dateText = dateAttr || dateEl?.textContent?.trim() || '';
        
        const imgEl = el.querySelector('img');
        const img = imgEl?.src;
        
        if (title && href && !seen.has(href) && title.length > 3) {
          seen.add(href);
          results.push({ title, dateStr: dateText, url: href, imageUrl: img });
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
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
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
        startDate: new Date(isoDate + 'T21:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'MilkBoy',
          address: '1100 Chestnut St, Philadelphia, PA 19107',
          city: 'Philadelphia'
        },
        latitude: 39.9507,
        longitude: -75.1588,
        city: 'Philadelphia',
        category: 'Nightlife',
        source: 'MilkBoy'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid MilkBoy events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  MilkBoy error:', error.message);
    return [];
  }
}

module.exports = scrapeMilkBoy;
