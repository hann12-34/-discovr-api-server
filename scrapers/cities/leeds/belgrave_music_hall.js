/**
 * Belgrave Music Hall Leeds Events Scraper
 * URL: https://www.belgravemusichall.com/whats-on
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBelgrave(city = 'Leeds') {
  console.log('🎸 Scraping Belgrave Music Hall...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.belgravemusichall.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Belgrave uses WordPress with event posts
      document.querySelectorAll('article, .event, [class*="event"], a[href*="/events/"]').forEach(item => {
        try {
          const linkEl = item.tagName === 'A' ? item : item.querySelector('a[href*="/events/"]');
          const url = linkEl?.href;
          if (!url || seen.has(url) || url === 'https://www.belgravemusichall.com/events/' || url.endsWith('/events/')) return;
          seen.add(url);
          
          const container = item.closest('article, div') || item;
          
          // Get title
          const titleEl = container.querySelector('h2, h3, h4, .title, [class*="title"], .entry-title');
          const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title.length > 150) return;
          
          // Get date - look in various places
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Belgrave Music Hall',
          address: '1-3 Cross Belgrave St, Leeds LS2 8JP',
          city: 'Leeds'
        },
        latitude: 53.7980,
        longitude: -1.5430,
        city: 'Leeds',
        category: 'Nightlife',
        source: 'Belgrave Music Hall'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Belgrave Music Hall events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Belgrave Music Hall error:', error.message);
    return [];
  }
}

module.exports = scrapeBelgrave;
