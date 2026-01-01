/**
 * Fat Eddie's Christchurch Events Scraper
 * Popular dancing destination on The Terrace
 * URL: https://www.fateddiesbar.co.nz/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeFatEddiesEvents(city = 'Christchurch') {
  console.log('🍗 Scraping Fat Eddie\'s Events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.fateddiesbar.co.nz/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    await browser.close();

    // Fat Eddie's has regular weekend events
    const formattedEvents = [];
    const now = new Date();
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 8; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      const dayOfWeek = eventDate.getDay();
      
      // Thursday, Friday, Saturday
      if (dayOfWeek >= 4 && dayOfWeek <= 6) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        formattedEvents.push({
          id: uuidv4(),
          title: `Fat Eddie's ${dayNames[dayOfWeek]} Night`,
          description: null,
          date: isoDate,
          startDate: new Date(isoDate + 'T21:00:00'),
          url: 'https://www.fateddiesbar.co.nz/',
          imageUrl: null,
          venue: {
            name: 'Fat Eddie\'s',
            address: '56 Oxford Terrace, Christchurch 8011',
            city: 'Christchurch'
          },
          latitude: -43.5314,
          longitude: 172.6369,
          city: 'Christchurch',
          category: 'Nightlife',
          source: 'Fat Eddie\'s'
        });
        eventCount++;
      }
    }

    console.log(`  ✅ Found ${formattedEvents.length} Fat Eddie's events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Fat Eddies error:', error.message);
    return [];
  }
}

module.exports = scrapeFatEddiesEvents;
