/**
 * Elland Road Leeds Events Scraper
 * URL: https://www.leedsunited.com/elland-road/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeEllandRoad(city = 'Leeds') {
  console.log('⚽ Scraping Elland Road...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.leedsunited.com/elland-road/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      const eventSelectors = ['.event-item', '.event', 'article', '[class*="event"]', '[class*="fixture"]', 'a[href*="/event"]'];
      let eventElements = [];
      for (const selector of eventSelectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }
      
      eventElements.forEach(item => {
        try {
          const linkEl = item.tagName === 'A' ? item : item.querySelector('a[href]');
          const url = linkEl?.href || item.querySelector('a')?.href;
          if (!url || seen.has(url) || url.endsWith('/events/') || url.endsWith('/events')) return;
          seen.add(url);
          
          const container = item.closest('div, article, li') || item;
          const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="name"]') || linkEl;
          const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title.length > 150) return;
          
          const dateEl = container.querySelector('time, .date, [class*="date"], [class*="time"]');
          const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
          
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
        startDate: new Date(isoDate + 'T15:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Elland Road',
          address: 'Elland Rd, Leeds LS11 0ES',
          city: 'Leeds'
        },
        latitude: 53.7778,
        longitude: -1.5722,
        city: 'Leeds',
        category: 'Arts',
        source: 'Elland Road'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Elland Road events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Elland Road error:', error.message);
    return [];
  }
}

module.exports = scrapeEllandRoad;
