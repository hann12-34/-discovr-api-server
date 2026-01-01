/**
 * Brooklyn Bowl Las Vegas Events Scraper
 * URL: https://www.brooklynbowl.com/las-vegas/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBrooklynBowl(city = 'Las Vegas') {
  console.log('🎳 Scraping Brooklyn Bowl...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.brooklynbowl.com/las-vegas/shows/all', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      const eventElements = document.querySelectorAll('.eventItem');
      
      eventElements.forEach(item => {
        try {
          const linkEl = item.querySelector('a[href*="/events/detail/"]');
          const url = linkEl?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);
          
          const titleEl = item.querySelector('h1, h2, h3, h4, .eventItem__title');
          const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title.length > 150) return;
          
          const dateEl = item.querySelector('time, .date, .eventItem__date, [class*="date"]');
          const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
          
          const imgEl = item.querySelector('img');
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
          const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?/i);
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
      const eventDate = new Date(isoDate);
      if (eventDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Brooklyn Bowl Las Vegas',
          address: '3545 Las Vegas Blvd S, Las Vegas, NV 89109',
          city: 'Las Vegas'
        },
        latitude: 36.1215,
        longitude: -115.1720,
        city: 'Las Vegas',
        category: 'Nightlife',
        source: 'Brooklyn Bowl'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Brooklyn Bowl events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Brooklyn Bowl error:', error.message);
    return [];
  }
}

module.exports = scrapeBrooklynBowl;
