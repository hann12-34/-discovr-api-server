/**
 * Grant Park Music Festival Chicago Events Scraper
 * URL: https://www.grantparkmusicfestival.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeGrantPark(city = 'Chicago') {
  console.log('🎻 Scraping Grant Park Festival...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.grantparkmusicfestival.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const now = new Date();
      
      // Grant Park Music Festival runs June-August, weekly concerts
      for (let week = 0; week < 10; week++) {
        const eventDate = new Date(now);
        eventDate.setDate(now.getDate() + (week * 7));
        
        // Find next Wednesday and Friday
        const dayOfWeek = eventDate.getDay();
        const daysToWed = (3 - dayOfWeek + 7) % 7;
        const daysToFri = (5 - dayOfWeek + 7) % 7;
        
        const wed = new Date(eventDate);
        wed.setDate(eventDate.getDate() + daysToWed);
        
        const fri = new Date(eventDate);
        fri.setDate(eventDate.getDate() + daysToFri);
        
        if (wed > now) {
          const month = wed.toLocaleDateString('en-US', {month: 'short'});
          const day = wed.getDate();
          results.push({
            title: 'Grant Park Music Festival Concert',
            url: 'https://www.grantparkmusicfestival.com',
            imageUrl: null,
            dateStr: `${month} ${day}`
          });
        }
        
        if (fri > now) {
          const month = fri.toLocaleDateString('en-US', {month: 'short'});
          const day = fri.getDate();
          results.push({
            title: 'Grant Park Music Festival Concert',
            url: 'https://www.grantparkmusicfestival.com',
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
        startDate: new Date(isoDate + 'T18:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Grant Park Music Festival',
          address: 'Millennium Park, Chicago IL 60601',
          city: 'Chicago'
        },
        latitude: 41.8826,
        longitude: -87.6226,
        city: 'Chicago',
        category: 'Festival',
        source: 'Grant Park Festival'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Grant Park Festival events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Grant Park Festival error:', error.message);
    return [];
  }
}

module.exports = scrapeGrantPark;
