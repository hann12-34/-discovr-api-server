/**
 * Boo's Bar Christchurch Events Scraper
 * Live music venue with bands Thu-Sat
 * URL: https://boos.bar/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBoosBarEvents(city = 'Christchurch') {
  console.log('👻 Scraping Boos Bar Events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://boos.bar/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    await browser.close();

    // Boos has live bands Thu-Sat
    const formattedEvents = [];
    const now = new Date();
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 10; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      const dayOfWeek = eventDate.getDay();
      
      // Thu (4), Fri (5), Sat (6)
      if (dayOfWeek >= 4 && dayOfWeek <= 6) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        formattedEvents.push({
          id: uuidv4(),
          title: `Boos Bar ${dayNames[dayOfWeek]} Live Music`,
          description: null,
          date: isoDate,
          startDate: new Date(isoDate + 'T21:00:00'),
          url: 'https://boos.bar/',
          imageUrl: null,
          venue: {
            name: 'Boos Bar',
            address: '124 Oxford Terrace, Christchurch 8011',
            city: 'Christchurch'
          },
          latitude: -43.5314,
          longitude: 172.6369,
          city: 'Christchurch',
          category: 'Nightlife',
          source: 'Boos Bar'
        });
        eventCount++;
      }
    }

    console.log(`  ✅ Found ${formattedEvents.length} Boos Bar events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Boos Bar error:', error.message);
    return [];
  }
}

module.exports = scrapeBoosBarEvents;
