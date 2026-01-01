/**
 * Ice Castles Edmonton Events Scraper
 * URL: https://icecastles.com/edmonton/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeIceCastles(city = 'Edmonton') {
  console.log('🏰 Scraping Ice Castles Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://icecastles.com/edmonton/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const pageText = document.body.textContent || '';
      
      // Look for date information on the page
      const dateMatches = pageText.matchAll(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/gi);
      
      for (const match of dateMatches) {
        results.push({
          title: 'Ice Castles Edmonton',
          dateStr: `${match[1]} ${match[2]} ${match[3] || '2025'}`,
          url: 'https://icecastles.com/edmonton/',
          imageUrl: document.querySelector('img[src*="ice"]')?.src || null
        });
        break; // Just get first date
      }

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        const match = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s+(\d{4})?/i);
        if (match) {
          const month = months[match[1].toLowerCase().substring(0, 3)];
          const day = match[2].padStart(2, '0');
          const year = match[3] || new Date().getFullYear();
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate || new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T17:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Ice Castles', address: 'Hawrelak Park, Edmonton, AB', city: 'Edmonton' },
        city: 'Edmonton',
        category: 'Festival',
        source: 'Ice Castles'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Ice Castles events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Ice Castles error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeIceCastles;
