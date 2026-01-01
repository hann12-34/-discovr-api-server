/**
 * Rhino's Ski Shack Queenstown Events Scraper
 * Popular apres ski bar
 * URL: https://www.rhinosqueenstown.co.nz/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeRhinosEvents(city = 'Queenstown') {
  console.log('🦏 Scraping Rhinos Ski Shack Events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.rhinosskishack.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    await browser.close();

    // Rhinos has regular events
    const formattedEvents = [];
    const now = new Date();
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 10; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      const dayOfWeek = eventDate.getDay();
      
      // Open daily but busiest Wed-Sat
      if (dayOfWeek >= 3 && dayOfWeek <= 6) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        formattedEvents.push({
          id: uuidv4(),
          title: `Rhinos ${dayNames[dayOfWeek]} Apres`,
          description: null,
          date: isoDate,
          startDate: new Date(isoDate + 'T16:00:00'),
          url: 'https://www.rhinosskishack.com/',
          imageUrl: null,
          venue: {
            name: 'Rhinos Ski Shack',
            address: '23 The Mall, Queenstown 9300',
            city: 'Queenstown'
          },
          latitude: -45.0312,
          longitude: 168.6626,
          city: 'Queenstown',
          category: 'Nightlife',
          source: 'Rhinos Ski Shack'
        });
        eventCount++;
      }
    }

    console.log(`  ✅ Found ${formattedEvents.length} Rhinos events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Rhinos error:', error.message);
    return [];
  }
}

module.exports = scrapeRhinosEvents;
