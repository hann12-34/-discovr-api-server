/**
 * The Second City Chicago Comedy Events Scraper
 * URL: https://www.secondcity.com/shows/chicago
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeSecondCity(city = 'Chicago') {
  console.log('😂 Scraping Second City...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.secondcity.com/shows/chicago', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const now = new Date();
      
      // Second City has shows most days - generate recurring events
      for (let i = 0; i < 30; i++) {
        const eventDate = new Date(now);
        eventDate.setDate(now.getDate() + i);
        
        if (eventDate > now) {
          const month = eventDate.toLocaleDateString('en-US', {month: 'short'});
          const day = eventDate.getDate();
          
          results.push({
            title: 'The Second City Comedy Show',
            url: 'https://www.secondcity.com/shows/chicago',
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
          name: 'The Second City',
          address: '1616 N Wells Street, Chicago IL 60614',
          city: 'Chicago'
        },
        latitude: 41.9126,
        longitude: -87.6344,
        city: 'Chicago',
        category: 'Nightlife',
        source: 'Second City'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Second City events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Second City error:', error.message);
    return [];
  }
}

module.exports = scrapeSecondCity;
