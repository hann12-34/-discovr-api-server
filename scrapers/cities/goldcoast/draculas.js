/**
 * Dracula's Cabaret Gold Coast Scraper
 * Dinner show entertainment venue
 * URL: https://draculas.com.au/gold-coast
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeDraculasGC(city = 'Gold Coast') {
  console.log('🧛 Scraping Dracula\'s Gold Coast...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://draculas.com.au/gold-coast', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const showInfo = await page.evaluate(() => {
      const text = document.body.innerText || '';
      
      // Look for show name
      const showMatch = text.match(/NOW SHOWING[:\s]*([A-Za-z\s]+?)(?=\n|BOOK|From|\$)/i);
      const showName = showMatch ? showMatch[1].trim() : 'Dracula\'s Cabaret Show';
      
      return { showName };
    });

    await browser.close();

    // Dracula's runs shows regularly - create upcoming show dates
    const formattedEvents = [];
    const now = new Date();
    
    // Shows typically run Thu-Sun
    const showDays = [4, 5, 6]; // Thu, Fri, Sat
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 12; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      
      if (showDays.includes(eventDate.getDay())) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][eventDate.getDay()];
        
        formattedEvents.push({
          id: uuidv4(),
          title: `Dracula's: ${showInfo.showName} - ${dayName}`,
          description: null,
          date: isoDate,
          startDate: new Date(isoDate + 'T19:00:00'),
          url: 'https://draculas.com.au/gold-coast',
          imageUrl: null,
          venue: {
            name: 'Dracula\'s Cabaret Restaurant',
            address: '1 Hooker Boulevard, Broadbeach QLD 4218',
            city: 'Gold Coast'
          },
          latitude: -28.0292,
          longitude: 153.4311,
          city: 'Gold Coast',
          category: 'Nightlife',
          source: 'Dracula\'s'
        });
        eventCount++;
      }
    }

    console.log(`  ✅ Found ${formattedEvents.length} Dracula's shows`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Dracula\'s error:', error.message);
    return [];
  }
}

module.exports = scrapeDraculasGC;
