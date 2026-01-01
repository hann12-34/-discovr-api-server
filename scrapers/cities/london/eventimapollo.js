/**
 * Eventim Apollo London Events Scraper
 * Major concert venue in Hammersmith
 * URL: https://www.eventimapollo.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeEventimApollo(city = 'London') {
  console.log('🎭 Scraping Eventim Apollo London...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.eventimapollo.com/events/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/events/"]').forEach(el => {
        const href = el.href;
        if (seen.has(href) || href.endsWith('/events/')) return;
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
        // Look for year anywhere in the string
        const yearMatch = event.dateStr.match(/(\d{4})/);
        const foundYear = yearMatch ? yearMatch[1] : null;
        
        // Handle formats like "Jan 2nd" or "Saturday 10th January"
        const dateMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:-[^0-9]*)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) ||
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
        imageUrl: null,
        venue: {
          name: 'Eventim Apollo',
          address: '45 Queen Caroline St, London W6 9QH',
          city: 'London'
        },
        latitude: 51.4930,
        longitude: -0.2251,
        city: 'London',
        category: 'Nightlife',
        source: 'Eventim Apollo'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Eventim Apollo events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Eventim Apollo error:', error.message);
    return [];
  }
}

module.exports = scrapeEventimApollo;
