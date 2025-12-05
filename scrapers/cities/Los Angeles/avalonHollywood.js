/**
 * Avalon Hollywood Nightclub Scraper
 * Legendary Hollywood nightclub since 1927
 * URL: https://avalonhollywood.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeAvalonHollywood(city = 'Los Angeles') {
  console.log('🌟 Scraping Avalon Hollywood...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://avalonhollywood.com/events/', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04', 
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      };
      
      const datePattern = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})?/i;
      
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[1];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3] || currentYear;
          const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()];
          const isoDate = `${year}-${month}-${day}`;
          
          let title = i > 0 ? lines[i - 1] : null;
          
          if (title && (title.length < 3 || title.includes('Tickets') || title.includes('RSVP'))) {
            title = i > 1 ? lines[i - 2] : null;
          }
          
          if (title && title.length > 3 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({ title, date: isoDate });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Avalon Hollywood events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://avalonhollywood.com/events/',
      imageUrl: null,
      venue: {
        name: 'Avalon Hollywood',
        address: '1735 Vine St, Los Angeles, CA 90028',
        city: 'Los Angeles'
      },
      latitude: 34.1028,
      longitude: -118.3267,
      city: 'Los Angeles',
      category: 'Nightlife',
      source: 'AvalonHollywood'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Avalon Hollywood error:', error.message);
    return [];
  }
}

module.exports = scrapeAvalonHollywood;
