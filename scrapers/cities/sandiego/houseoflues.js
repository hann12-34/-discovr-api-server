/**
 * House of Blues San Diego Events Scraper
 * Major live music venue in the Gaslamp Quarter
 * URL: https://www.houseofblues.com/sandiego/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeHouseOfBlues(city = 'San Diego') {
  console.log('🎸 Scraping House of Blues San Diego...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.houseofblues.com/sandiego/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.eventItem, .event-item, .event-list-item, article').forEach(el => {
        const titleEl = el.querySelector('h2, h3, .event-title, .title');
        const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
        
        const linkEl = el.querySelector('a[href*="event"]');
        const href = linkEl?.href;
        
        const dateEl = el.querySelector('.event-date, .date, time');
        const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
        
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'House of Blues',
          address: '1055 Fifth Ave, San Diego, CA 92101',
          city: 'San Diego'
        },
        latitude: 32.7141,
        longitude: -117.1602,
        city: 'San Diego',
        category: 'Nightlife',
        source: 'House of Blues'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid House of Blues events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  House of Blues error:', error.message);
    return [];
  }
}

module.exports = scrapeHouseOfBlues;
