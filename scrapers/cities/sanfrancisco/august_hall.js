/**
 * August Hall San Francisco Events Scraper
 * URL: https://www.augusthallsf.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeAugustHall(city = 'San Francisco') {
  console.log('🎸 Scraping August Hall...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.augusthallsf.com/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event/"]').forEach(el => {
        const url = el.href;
        if (seen.has(url) || url.endsWith('/event/') || url.endsWith('/events/')) return;
        seen.add(url);
        
        let parent = el;
        for (let i = 0; i < 4; i++) {
          parent = parent.parentElement;
          if (!parent) break;
        }
        
        const title = parent?.querySelector('h1, h2, h3, h4, .tw-name, [class*="title"]')?.textContent?.trim()?.replace(/\s+/g, ' ');
        if (!title || title.length < 3) return;
        
        const dateText = parent?.textContent || '';
        const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
        const dateStr = dateMatch ? dateMatch[0] : null;
        
        const img = parent?.querySelector('img')?.src;
        
        results.push({ title, dateStr, url, imageUrl: img });
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
          name: 'August Hall',
          address: '420 Mason St, San Francisco, CA 94102',
          city: 'San Francisco'
        },
        latitude: 37.7870,
        longitude: -122.4095,
        city: 'San Francisco',
        category: 'Nightlife',
        source: 'August Hall'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} August Hall events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  August Hall error:', error.message);
    return [];
  }
}

module.exports = scrapeAugustHall;
