/**
 * Humphreys Concerts By The Bay San Diego Events Scraper
 * Premier outdoor concert venue on Shelter Island
 * URL: https://www.humphreysconcerts.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeHumphreys(city = 'San Diego') {
  console.log('🎵 Scraping Humphreys Concerts San Diego...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.humphreysconcerts.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.event, .concert, article, .show-item').forEach(el => {
        const titleEl = el.querySelector('h1, h2, h3, h4, .event-title, .artist-name');
        const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
        
        const linkEl = el.querySelector('a[href*="event"], a[href*="concert"]');
        const href = linkEl?.href;
        
        const dateEl = el.querySelector('time, .event-date, .date, .concert-date');
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
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Humphreys Concerts by the Bay',
          address: '2241 Shelter Island Dr, San Diego, CA 92106',
          city: 'San Diego'
        },
        latitude: 32.7235,
        longitude: -117.2269,
        city: 'San Diego',
        category: 'Concert',
        source: 'Humphreys Concerts'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Humphreys events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Humphreys error:', error.message);
    return [];
  }
}

module.exports = scrapeHumphreys;
