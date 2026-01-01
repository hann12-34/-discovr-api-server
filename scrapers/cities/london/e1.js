/**
 * E1 London Events Scraper
 * Warehouse venue in East London
 * URL: https://e1-london.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeE1(city = 'London') {
  console.log('🎧 Scraping E1 London...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://e1-london.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const eventItems = document.querySelectorAll('.event-card, .event, [class*="event"], article');
      
      eventItems.forEach(item => {
        try {
          const titleEl = item.querySelector('h2, h3, h4, .title, .event-title');
          const title = titleEl ? titleEl.textContent.trim() : null;
          if (!title || title.length < 3) return;
          
          const dateEl = item.querySelector('time, .date, [class*="date"]');
          let dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null;
          
          const linkEl = item.querySelector('a[href]');
          let url = linkEl ? linkEl.href : null;
          
          const imgEl = item.querySelector('img');
          let imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;
          
          const descEl = item.querySelector('.description, .lineup, p');
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
        description: event.description || `Event at E1 London`,
        date: isoDate,
        startDate: new Date(isoDate + 'T22:00:00'),
        url: event.url,
        imageUrl: null,
        venue: {
          name: 'E1 London',
          address: '110 Pennington Street, London E1W 2BB',
          city: 'London'
        },
        latitude: 51.5087,
        longitude: -0.0646,
        city: 'London',
        category: 'Nightlife',
        source: 'E1 London'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid E1 events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  E1 error:', error.message);
    return [];
  }
}

module.exports = scrapeE1;
