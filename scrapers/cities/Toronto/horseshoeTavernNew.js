/**
 * Horseshoe Tavern Events Scraper (Toronto)
 * Historic Toronto live music venue
 * URL: https://www.horseshoetavern.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeHorseshoeTavern(city = 'Toronto') {
  console.log('🐴 Scraping Horseshoe Tavern...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.horseshoetavern.com/events/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      // Month mapping
      const months = {
        'JANUARY': '01', 'FEBRUARY': '02', 'MARCH': '03', 'APRIL': '04',
        'MAY': '05', 'JUNE': '06', 'JULY': '07', 'AUGUST': '08',
        'SEPTEMBER': '09', 'OCTOBER': '10', 'NOVEMBER': '11', 'DECEMBER': '12'
      };
      
      // Date pattern: "TUESDAY, DECEMBER 2, 2025"
      const datePattern = /^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY),\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2}),\s+(\d{4})$/i;
      
      const seen = new Set();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[2].toUpperCase();
          const day = dateMatch[3].padStart(2, '0');
          const year = dateMatch[4];
          const month = months[monthStr];
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the line BEFORE the date
          let title = i > 0 ? lines[i - 1] : null;
          
          // Skip if title looks like navigation
          if (title && (
            title.match(datePattern) ||
            title === 'Upcoming Shows' ||
            title.includes('DOOR TIME') ||
            title.includes('TICKETS') ||
            title.match(/^\$[\d.]+$/) ||
            title.match(/^\d+\+$/) ||
            title.match(/^\d+:\d+\s*(AM|PM)$/i) ||
            title.length < 3
          )) {
            title = null;
          }
          
          if (title && title.length > 3 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({
              title: title,
              date: isoDate
            });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Horseshoe Tavern events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.horseshoetavern.com/events/',
      imageUrl: null,
      venue: {
        name: 'Horseshoe Tavern',
        address: '370 Queen St W, Toronto, ON M5V 2A2',
        city: 'Toronto'
      },
      latitude: 43.6494,
      longitude: -79.3956,
      city: 'Toronto',
      category: 'Nightlife',
      source: 'Horseshoe Tavern'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Horseshoe error:', error.message);
    return [];
  }
}

module.exports = scrapeHorseshoeTavern;
