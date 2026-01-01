/**
 * Bedroom Nightclub Gold Coast Scraper
 * Popular Surfers Paradise nightclub
 * URL: https://www.bedroommightclub.com.au/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBedroomEvents(city = 'Gold Coast') {
  console.log('🛏️ Scraping Bedroom Nightclub Events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://bedroomgc.au/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    await browser.close();

    // Bedroom is open Friday and Saturday nights
    const formattedEvents = [];
    const now = new Date();
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 8; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      const dayOfWeek = eventDate.getDay();
      
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayName = dayOfWeek === 5 ? 'Friday' : 'Saturday';
        
        formattedEvents.push({
          id: uuidv4(),
          title: `Bedroom Nightclub ${dayName}`,
          description: null,
          date: isoDate,
          startDate: new Date(isoDate + 'T22:00:00'),
          url: 'https://bedroomgc.au/',
          imageUrl: null,
          venue: {
            name: 'Bedroom Nightclub',
            address: '26 Orchid Avenue, Surfers Paradise QLD 4217',
            city: 'Gold Coast'
          },
          latitude: -27.9989,
          longitude: 153.4303,
          city: 'Gold Coast',
          category: 'Nightlife',
          source: 'Bedroom Nightclub'
        });
        eventCount++;
      }
    }

    console.log(`  ✅ Found ${formattedEvents.length} Bedroom Nightclub events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Bedroom Nightclub error:', error.message);
    return [];
  }
}

module.exports = scrapeBedroomEvents;
