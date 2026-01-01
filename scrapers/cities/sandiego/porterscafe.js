/**
 * Porter's Pub San Diego Events Scraper
 * URL: https://porterspub.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapePortersPub(city = 'San Diego') {
  console.log('🍺 Scraping Porter\'s Pub San Diego...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://porterspub.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.tribe-events-calendar-list__event, [class*="event"], article').forEach(el => {
        const linkEl = el.querySelector('a[href*="event"]');
        const href = linkEl?.href;
        if (!href || seen.has(href)) return;
        seen.add(href);
        
        const titleEl = el.querySelector('h3, .tribe-events-calendar-list__event-title, [class*="title"]');
        const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
        
        const dateEl = el.querySelector('time, .tribe-event-date-start');
        const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
        
        const imgEl = el.querySelector('img');
        const img = imgEl?.src;
        
        if (title && title.length > 2) {
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
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
          if (dateMatch) {
            const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            const day = dateMatch[2].padStart(2, '0');
            let year = now.getFullYear().toString();
            if (parseInt(month) < now.getMonth() + 1) year = (now.getFullYear() + 1).toString();
            isoDate = `${year}-${month}-${day}`;
          }
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
          name: 'Porter\'s Pub',
          address: '9500 Gilman Dr, La Jolla, CA 92093',
          city: 'San Diego'
        },
        latitude: 32.8794,
        longitude: -117.2359,
        city: 'San Diego',
        category: 'Nightlife',
        source: 'Porter\'s Pub'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Porter's Pub events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Porter\'s Pub error:', error.message);
    return [];
  }
}

module.exports = scrapePortersPub;
