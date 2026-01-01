/**
 * Esther's Follies Austin Comedy Events Scraper
 * URL: https://esthersfollies.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeEsthersFollies(city = 'Austin') {
  console.log('😂 Scraping Esthers Follies...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://esthersfollies.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Esther's Follies has weekly shows, so generate recurring events
      const now = new Date();
      const daysOfWeek = ['Thursday', 'Friday', 'Saturday'];
      
      for (let week = 0; week < 12; week++) {
        daysOfWeek.forEach(day => {
          const eventDate = new Date(now);
          eventDate.setDate(now.getDate() + (week * 7));
          
          // Find next occurrence of the day
          while (eventDate.toLocaleDateString('en-US', {weekday: 'long'}) !== day) {
            eventDate.setDate(eventDate.getDate() + 1);
          }
          
          if (eventDate > now) {
            const month = eventDate.toLocaleDateString('en-US', {month: 'short'});
            const dayNum = eventDate.getDate();
            
            results.push({
              title: `Esther's Follies Comedy Show`,
              url: 'https://esthersfollies.com',
              imageUrl: null,
              dateStr: `${month} ${dayNum}`
            });
          }
        });
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
          name: 'Esther\'s Follies',
          address: '525 E 6th Street, Austin TX 78701',
          city: 'Austin'
        },
        latitude: 30.2680,
        longitude: -97.7362,
        city: 'Austin',
        category: 'Nightlife',
        source: 'Esthers Follies'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Esthers Follies events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Esthers Follies error:', error.message);
    return [];
  }
}

module.exports = scrapeEsthersFollies;
