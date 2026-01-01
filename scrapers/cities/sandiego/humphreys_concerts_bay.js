/**
 * Humphreys Concerts by the Bay San Diego Enhanced Events Scraper
 * URL: https://www.humphreysconcerts.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeHumphreysSD(city = 'San Diego') {
  console.log('🌊 Scraping Humphreys Enhanced...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.humphreysconcerts.com/events', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('div.event, article, .concert-item, a[href*="event"]').forEach(el => {
        const link = el.querySelector('a[href]') || (el.tagName === 'A' ? el : null);
        if (!link?.href) return;
        
        const href = link.href;
        const text = (link.textContent || el.textContent).trim();
        
        if (text.length > 3 && text.length < 150 && !seen.has(text)) {
          seen.add(text);
          
          const img = el.querySelector('img');
          const dateMatch = el.textContent.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
          
          results.push({
            title: text.replace(/\s+/g, ' '),
            url: href,
            imageUrl: img?.src || null,
            dateStr: dateMatch ? dateMatch[0] : null
          });
        }
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const now = new Date();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const monthMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        const dayMatch = event.dateStr.match(/(\d{1,2})/);
        
        if (monthMatch && dayMatch) {
          const month = (months.indexOf(monthMatch[1].toLowerCase()) + 1).toString().padStart(2, '0');
          const day = dayMatch[1].padStart(2, '0');
          let year = now.getFullYear();
          if (parseInt(month) < now.getMonth() + 1) year++;
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Humphreys Concerts by the Bay',
          address: '2241 Shelter Island Drive, San Diego CA 92106',
          city: 'San Diego'
        },
        latitude: 32.7268,
        longitude: -117.2262,
        city: 'San Diego',
        category: 'Nightlife',
        source: 'Humphreys Concerts'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Humphreys Enhanced events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Humphreys Enhanced error:', error.message);
    return [];
  }
}

module.exports = scrapeHumphreysSD;
