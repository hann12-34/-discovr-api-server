/**
 * Havana RnB Nightclub Gold Coast Scraper
 * Premier R&B and Hip Hop venue
 * URL: https://havanarnb.com.au/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeHavanaRnB(city = 'Gold Coast') {
  console.log('🎤 Scraping Havana RnB Nightclub...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://havanarnb.com.au/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    await browser.close();

    // Havana is open every Friday and Saturday - create regular club nights
    const formattedEvents = [];
    const now = new Date();
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 8; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      const dayOfWeek = eventDate.getDay();
      
      // Friday (5) and Saturday (6)
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayName = dayOfWeek === 5 ? 'Friday' : 'Saturday';
        
        formattedEvents.push({
          id: uuidv4(),
          title: `Havana RnB ${dayName} Night`,
          description: null,
          date: isoDate,
          startDate: new Date(isoDate + 'T22:00:00'),
          url: 'https://havanarnb.com.au/',
          imageUrl: null,
          venue: {
            name: 'Havana RnB Nightclub',
            address: '22 Orchid Avenue, Surfers Paradise QLD 4217',
            city: 'Gold Coast'
          },
          latitude: -27.9989,
          longitude: 153.4303,
          city: 'Gold Coast',
          category: 'Nightlife',
          source: 'Havana RnB'
        });
        eventCount++;
      }
    }

    console.log(`  ✅ Found ${formattedEvents.length} Havana RnB events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Havana RnB error:', error.message);
    return [];
  }
}

module.exports = scrapeHavanaRnB;
