/**
 * Ottawa Dalfest Events Scraper
 * Dalhousie Street Festival
 * URL: https://www.dalfest.ca/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeDalfest(city = 'Ottawa') {
  console.log('🎪 Scraping Dalfest Ottawa...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.dalfest.ca/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      
      // Look for festival information
      const title = document.querySelector('h1, .title')?.textContent?.trim() || 'Dalfest Ottawa';
      const img = document.querySelector('img')?.src;
      
      // Look for date
      const fullText = document.body.textContent;
      const dateMatch = fullText.match(/(June|July|August|September)\s*(\d{1,2})[\s,\-]*(\d{4})?/i);
      
      if (dateMatch) {
        results.push({
          title: 'Dalfest - Dalhousie Street Festival',
          dateStr: dateMatch[0],
          url: 'https://www.dalfest.ca/',
          imageUrl: img
        });
      }
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { june: '06', july: '07', august: '08', september: '09' };
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(June|July|August|September)\s*(\d{1,2})[\s,\-]*(\d{4})?/i);
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase()];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3] || new Date().getFullYear().toString();
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      // Default to summer date if not found
      if (!isoDate) {
        const currentYear = new Date().getFullYear();
        isoDate = `${currentYear}-08-15`;
      }
      
      if (new Date(isoDate) < new Date()) {
        const nextYear = new Date().getFullYear() + 1;
        isoDate = `${nextYear}-08-15`;
      }
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T12:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Dalfest',
          address: 'Dalhousie Street, Ottawa, ON K1N 7C4',
          city: 'Ottawa'
        },
        latitude: 45.4286,
        longitude: -75.6932,
        city: 'Ottawa',
        category: 'Festivals',
        source: 'Dalfest'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Dalfest events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Dalfest error:', error.message);
    return [];
  }
}

module.exports = scrapeDalfest;
