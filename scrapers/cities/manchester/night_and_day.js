/**
 * Night and Day Cafe Manchester Events Scraper
 * URL: https://nightnday.org/listings/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeNightAndDay(city = 'Manchester') {
  console.log('☕ Scraping Night and Day Cafe...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-GB,en;q=0.9' });

    await page.goto('https://nightnday.org/listings/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Night and Day uses WordPress with listing posts
      document.querySelectorAll('article, .listing, .post, [class*="listing"], a[href*="/listings/"]').forEach(item => {
        try {
          const linkEl = item.tagName === 'A' ? item : item.querySelector('a[href*="/listings/"]');
          const url = linkEl?.href;
          if (!url || seen.has(url) || url === 'https://nightnday.org/listings/' || url.endsWith('/listings/')) return;
          seen.add(url);
          
          const container = item.closest('article') || item;
          
          // Get title
          const titleEl = container.querySelector('h2, h3, h4, .entry-title, .title, [class*="title"]');
          const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title.length > 150) return;
          
          // Get date from various possible locations
          const dateEl = container.querySelector('time, .date, [class*="date"], .meta');
          const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
          
          // Get image
          const imgEl = container.querySelector('img');
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
          
          results.push({ title, dateStr, url, imageUrl });
        } catch (e) {}
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
          const dateMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            let year = dateMatch[3] || now.getFullYear().toString();
            if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
              year = (now.getFullYear() + 1).toString();
            }
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
          name: 'Night and Day Cafe',
          address: '26 Oldham St, Manchester M1 1JN',
          city: 'Manchester'
        },
        latitude: 53.4830,
        longitude: -2.2360,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'Night and Day Cafe'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Night and Day events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Night and Day error:', error.message);
    return [];
  }
}

module.exports = scrapeNightAndDay;
