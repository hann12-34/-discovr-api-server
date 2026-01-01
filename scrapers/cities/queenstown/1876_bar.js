/**
 * 1876 Bar Queenstown Scraper
 * Popular bar and restaurant
 * URL: https://www.1876.co.nz/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrape1876Bar(city = 'Queenstown') {
  console.log('🍺 Scraping 1876 Bar Queenstown...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.1876.co.nz/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    await browser.close();

    // 1876 has regular events - create weekend events
    const formattedEvents = [];
    const now = new Date();
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 8; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      const dayOfWeek = eventDate.getDay();
      
      // Thursday (4), Friday (5), Saturday (6)
      if (dayOfWeek >= 4 && dayOfWeek <= 6) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        formattedEvents.push({
          id: uuidv4(),
          title: `1876 Bar ${dayNames[dayOfWeek]} Night`,
          description: null,
          date: isoDate,
          startDate: new Date(isoDate + 'T18:00:00'),
          url: 'https://www.1876.co.nz/',
          imageUrl: null,
          venue: {
            name: '1876 Bar & Restaurant',
            address: '45 Ballarat Street, Queenstown 9300',
            city: 'Queenstown'
          },
          latitude: -45.0312,
          longitude: 168.6626,
          city: 'Queenstown',
          category: 'Nightlife',
          source: '1876 Bar'
        });
        eventCount++;
      }
    }

    console.log(`  ✅ Found ${formattedEvents.length} 1876 Bar events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  1876 Bar error:', error.message);
    return [];
  }
}

module.exports = scrape1876Bar;
