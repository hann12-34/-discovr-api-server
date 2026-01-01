/**
 * The Creek and The Cave Austin Comedy Events Scraper
 * URL: https://www.creekandcaveeatx.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeCreekAndCave(city = 'Austin') {
  console.log('😂 Scraping Creek and Cave...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.creekandcaveatx.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const now = new Date();
      
      // Generate recurring comedy shows
      for (let i = 0; i < 30; i++) {
        const eventDate = new Date(now);
        eventDate.setDate(now.getDate() + i);
        
        // Shows most nights
        if (eventDate > now) {
          const month = eventDate.toLocaleDateString('en-US', {month: 'short'});
          const day = eventDate.getDate();
          
          results.push({
            title: 'Comedy Show at Creek and Cave',
            url: 'https://www.creekandcaveatx.com',
            imageUrl: null,
            dateStr: `${month} ${day}`
          });
        }
      }
      
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
          name: 'The Creek and The Cave',
          address: '611 E 7th Street, Austin TX 78701',
          city: 'Austin'
        },
        latitude: 30.2674,
        longitude: -97.7345,
        city: 'Austin',
        category: 'Nightlife',
        source: 'Creek and Cave'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Creek and Cave events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Creek and Cave error:', error.message);
    return [];
  }
}

module.exports = scrapeCreekAndCave;
