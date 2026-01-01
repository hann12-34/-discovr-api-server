/**
 * Sankeys Manchester - Legendary Nightclub
 * URL: https://www.sankeys.info
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeSankeys(city = 'Manchester') {
  console.log('🎧 Scraping Sankeys...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.sankeys.info/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.event, .event-card, article, [class*="event"], .list-item').forEach(el => {
        try {
          const titleEl = el.querySelector('h1, h2, h3, h4, .title, .event-title, [class*="title"], .name');
          const title = titleEl ? titleEl.textContent.trim() : null;
          if (!title || title.length < 3 || seen.has(title)) return;
          seen.add(title);
          
          const link = el.querySelector('a');
          const url = link ? link.href : '';
          
          const img = el.querySelector('img:not([src*="logo"]):not([alt*="logo"])');
          const imageUrl = img ? (img.src || img.dataset.src) : null;
          
          const dateEl = el.querySelector('time, .date, [class*="date"]');
          const dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null;
          
          results.push({ title, url, imageUrl, dateStr });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const match = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2}),?\s*(\d{4})?/i);
          if (match) {
            const month = (months.indexOf(match[1].toLowerCase().substring(0, 3)) + 1).toString().padStart(2, '0');
            const day = match[2].padStart(2, '0');
            const year = match[3] || new Date().getFullYear();
            isoDate = `${year}-${month}-${day}`;
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
        startDate: new Date(isoDate + 'T23:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Sankeys Manchester',
          address: 'Beehive Mill, Jersey Street, Manchester M4 6JG',
          city: 'Manchester'
        },
        latitude: 53.4833,
        longitude: -2.2264,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'Sankeys'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Sankeys events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Sankeys error:', error.message);
    return [];
  }
}

module.exports = scrapeSankeys;
