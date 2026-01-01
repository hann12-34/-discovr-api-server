/**
 * The Fillmore Philadelphia Events Scraper
 * URL: https://www.thefillmorephilly.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeFillmorePhilly(city = 'Philadelphia') {
  console.log('🎸 Scraping Fillmore Philly...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.thefillmorephilly.com/events', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="event"]').forEach(link => {
        const href = link.href;
        const text = link.textContent.trim();
        
        if (text.length > 3 && text.length < 150 && !seen.has(text)) {
          seen.add(text);
          
          let container = link.parentElement?.parentElement;
          const img = container?.querySelector('img');
          const allText = container?.textContent || text;
          const dateMatch = allText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
          
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'The Fillmore Philadelphia',
          address: '29 E Allen Street, Philadelphia PA 19123',
          city: 'Philadelphia'
        },
        latitude: 39.9656,
        longitude: -75.1393,
        city: 'Philadelphia',
        category: 'Nightlife',
        source: 'Fillmore Philly'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Fillmore events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Fillmore error:', error.message);
    return [];
  }
}

module.exports = scrapeFillmorePhilly;
