/**
 * Mavericks Bar Ottawa Events Scraper
 * Popular bar and nightlife venue
 * URL: https://mavericksbar.ca/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeMavericks(city = 'Ottawa') {
  console.log('🎉 Scraping Mavericks Bar Ottawa...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://mavericksbar.ca/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.event-card, .event, article, [class*="event"], .tribe-events-list-event-row').forEach(item => {
        try {
          const titleEl = item.querySelector('h2, h3, h4, .event-title, .tribe-events-list-event-title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : null;
          if (!title || title.length < 3) return;
          
          const linkEl = item.querySelector('a[href]');
          const url = linkEl ? linkEl.href : null;
          if (!url || seen.has(url)) return;
          seen.add(url);
          
          const dateEl = item.querySelector('time, .date, [class*="date"], .tribe-event-date-start');
          const dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null;
          
          const imgEl = item.querySelector('img');
          const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;
          
          results.push({ title, dateStr, url, imageUrl });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2}),?\s*(\d{4})/i) ||
                           event.dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (dateMatch) {
            if (dateMatch[1].match(/[A-Za-z]/)) {
              const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
              const day = dateMatch[2].padStart(2, '0');
              const year = dateMatch[3];
              isoDate = `${year}-${month}-${day}`;
            } else {
              const month = dateMatch[1].padStart(2, '0');
              const day = dateMatch[2].padStart(2, '0');
              const year = dateMatch[3];
              isoDate = `${year}-${month}-${day}`;
            }
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T21:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Mavericks Bar',
          address: '348 Rideau Street, Ottawa, ON K1N 5Y9',
          city: 'Ottawa'
        },
        latitude: 45.4279,
        longitude: -75.6845,
        city: 'Ottawa',
        category: 'Nightlife',
        source: 'Mavericks Bar'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Mavericks events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Mavericks error:', error.message);
    return [];
  }
}

module.exports = scrapeMavericks;
