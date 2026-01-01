/**
 * SOMA San Diego Events Scraper
 * All-ages concert venue
 * URL: https://www.somasandiego.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeSoma(city = 'San Diego') {
  console.log('🎸 Scraping SOMA San Diego...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.somasandiego.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('[class*="event"], article').forEach(el => {
        const dateEl = el.querySelector('.event-date');
        const dateText = dateEl?.textContent?.replace(/\s+/g, ' ')?.trim();
        
        const linkEl = el.querySelector('a[href*="/event/"]');
        const url = linkEl?.href;
        
        const titleEl = el.querySelector('h2, h3, .event-title');
        const title = titleEl?.textContent?.trim();
        
        const imgEl = el.querySelector('img');
        const img = imgEl?.src;
        
        if (title && title.length > 3 && url && !seen.has(url)) {
          seen.add(url);
          results.push({ title, dateStr: dateText, url, imageUrl: img });
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
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'SOMA',
          address: '3350 Sports Arena Blvd, San Diego, CA 92110',
          city: 'San Diego'
        },
        latitude: 32.7579,
        longitude: -117.2117,
        city: 'San Diego',
        category: 'Nightlife',
        source: 'SOMA'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid SOMA events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  SOMA error:', error.message);
    return [];
  }
}

module.exports = scrapeSoma;
