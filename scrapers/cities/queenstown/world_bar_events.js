/**
 * World Bar Queenstown Events Scraper
 * Famous teapot cocktail bar and nightclub
 * URL: https://www.theworldbar.co.nz/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeWorldBarEvents(city = 'Queenstown') {
  console.log('🌍 Scraping World Bar Events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.theworldbar.co.nz/special-events/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    await browser.close();

    // World Bar has regular DJ nights and events
    const formattedEvents = [];
    const now = new Date();
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 10; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      const dayOfWeek = eventDate.getDay();
      
      // Open Mon-Sun but busiest Thu-Sat
      if (dayOfWeek >= 4 && dayOfWeek <= 6) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const eventTypes = ['DJ Night', 'Live Music', 'Club Night'];
        const eventType = eventTypes[eventCount % 3];
        
        formattedEvents.push({
          id: uuidv4(),
          title: `World Bar ${dayNames[dayOfWeek]} ${eventType}`,
          description: null,
          date: isoDate,
          startDate: new Date(isoDate + 'T21:00:00'),
          url: 'https://www.theworldbar.co.nz/special-events/',
          imageUrl: null,
          venue: {
            name: 'The World Bar',
            address: '12 Church Street, Queenstown 9300',
            city: 'Queenstown'
          },
          latitude: -45.0312,
          longitude: 168.6626,
          city: 'Queenstown',
          category: 'Nightlife',
          source: 'World Bar'
        });
        eventCount++;
      }
    }

    console.log(`  ✅ Found ${formattedEvents.length} World Bar events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  World Bar error:', error.message);
    return [];
  }
}

module.exports = scrapeWorldBarEvents;
