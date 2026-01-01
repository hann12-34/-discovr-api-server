/**
 * The Venue Nightclub Manchester
 * URL: https://www.thevenuenightclub.co.uk
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeTheVenueNightclub(city = 'Manchester') {
  console.log('🎵 Scraping The Venue Nightclub...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.thevenuenightclub.co.uk/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.event, article, [class*="event"], .show, .listing').forEach(el => {
        try {
          const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : null;
          if (!title || title.length < 3 || seen.has(title)) return;
          seen.add(title);
          
          const link = el.querySelector('a');
          const url = link ? link.href : '';
          
          const img = el.querySelector('img:not([src*="logo"])');
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'The Venue Nightclub',
          address: '119-121 Princess Street, Manchester M1 7AG',
          city: 'Manchester'
        },
        latitude: 53.476,
        longitude: -2.2384,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'The Venue Nightclub'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} The Venue Nightclub events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  The Venue Nightclub error:', error.message);
    return [];
  }
}

module.exports = scrapeTheVenueNightclub;
