/**
 * Hakkasan Las Vegas Events Scraper
 * Major nightclub at MGM Grand
 * URL: https://hakkasannightclub.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeHakkasan(city = 'Las Vegas') {
  console.log('🎧 Scraping Hakkasan Las Vegas...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://hakkasannightclub.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const eventItems = document.querySelectorAll('.event-card, .event, [class*="event"], article');
      
      eventItems.forEach(item => {
        try {
          const titleEl = item.querySelector('h2, h3, h4, .title, .event-title, .artist');
          const title = titleEl ? titleEl.textContent.trim() : null;
          if (!title || title.length < 3) return;
          
          const dateEl = item.querySelector('time, .date, [class*="date"]');
          let dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null;
          
          const linkEl = item.querySelector('a[href]');
          let url = linkEl ? linkEl.href : null;
          
          const imgEl = item.querySelector('img');
          let imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;
          
          const descEl = item.querySelector('.description, p');
          const description = descEl ? descEl.textContent.trim().substring(0, 300) : null;
          
          if (title) {
            results.push({ title, dateStr, url, imageUrl, description });
          }
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
          const dateMatch = event.dateStr.match(/(\d{1,2})[\/\.\s]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\.\s]*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            const year = dateMatch[3] || new Date().getFullYear().toString();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: event.description || `Club night at Hakkasan`,
        date: isoDate,
        startDate: new Date(isoDate + 'T22:00:00'),
        url: event.url,
        imageUrl: event.imageUrl || null,
        venue: {
          name: 'Hakkasan',
          address: '3799 S Las Vegas Blvd, Las Vegas NV 89109',
          city: 'Las Vegas'
        },
        latitude: 36.1024,
        longitude: -115.1693,
        city: 'Las Vegas',
        category: 'Nightlife',
        source: 'Hakkasan'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Hakkasan events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Hakkasan error:', error.message);
    return [];
  }
}

module.exports = scrapeHakkasan;
