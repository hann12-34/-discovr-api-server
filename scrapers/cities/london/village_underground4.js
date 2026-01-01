/**
 * Village Underground London Events Scraper v4
 * URL: https://villageunderground.co.uk/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeVillageUnderground4(city = 'London') {
  console.log('🎵 Scraping Village Underground London...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://villageunderground.co.uk/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href]').forEach(el => {
        const href = el.href;
        if (!href || seen.has(href)) return;
        if (!href.includes('/event') && !href.includes('/show')) return;
        if (href.endsWith('/events') || href.endsWith('/events/')) return;
        seen.add(href);
        
        let container = el;
        let title = null;
        let dateStr = null;
        let img = null;
        
        for (let i = 0; i < 10; i++) {
          if (!container) break;
          
          if (!title) {
            const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="name"]');
            title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
          }
          
          if (!dateStr) {
            const dateEl = container.querySelector('time, .date, [class*="date"]');
            dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
          }
          
          if (!img) {
            const imgEl = container.querySelector('img');
            img = imgEl?.src || imgEl?.getAttribute('data-src');
          }
          
          if (title && dateStr) break;
          container = container.parentElement;
        }
        
        if (!title) {
          const urlParts = href.split('/');
          const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
          title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        
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
    const seenEvents = new Set();
    
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
      
      const eventKey = `${event.title.substring(0,50)}-${isoDate}`;
      if (seenEvents.has(eventKey)) continue;
      seenEvents.add(eventKey);
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('logo')) ? event.imageUrl : null,
        venue: {
          name: 'Village Underground',
          address: '54 Holywell Ln, London EC2A 3PQ',
          city: 'London'
        },
        latitude: 51.5254,
        longitude: -0.0823,
        city: 'London',
        category: 'Nightlife',
        source: 'Village Underground'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Village Underground events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Village Underground error:', error.message);
    return [];
  }
}

module.exports = scrapeVillageUnderground4;
