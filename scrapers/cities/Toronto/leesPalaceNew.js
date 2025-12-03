/**
 * Lee's Palace Events Scraper (Toronto)
 * Iconic Toronto live music venue
 * URL: https://www.leespalace.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeLeesPalace(city = 'Toronto') {
  console.log('🎸 Scraping Lee\'s Palace...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.leespalace.com/events/', {
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
      
      // Date pattern: "THURSDAY, DECEMBER 4, 2025"
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
          
          // Check next line for venue info
          let venue = 'Lee\'s Palace';
          if (i + 2 < lines.length && lines[i + 1] === 'VENUE:') {
            const venueLine = lines[i + 2];
            if (venueLine === 'DANCE CAVE') {
              venue = 'Dance Cave';
            }
          }
          
          // Skip if title looks like navigation
          if (title && (
            title.match(datePattern) ||
            title === 'Upcoming Shows' ||
            title.includes('VENUE') ||
            title.includes('TICKETS') ||
            title.match(/^\$[\d.]+$/) ||
            title.match(/^\d+\+$/) ||
            title.length < 3
          )) {
            title = null;
          }
          
          if (title && title.length > 3 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({
              title: title,
              date: isoDate,
              venue: venue
            });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Lee's Palace events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.leespalace.com/events/',
      imageUrl: null,
      venue: {
        name: event.venue,
        address: '529 Bloor St W, Toronto, ON M5S 1Y5',
        city: 'Toronto'
      },
      latitude: 43.6651,
      longitude: -79.4089,
      city: 'Toronto',
      category: 'Nightlife',
      source: 'Lee\'s Palace'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Lee\'s Palace error:', error.message);
    return [];
  }
}

module.exports = scrapeLeesPalace;
