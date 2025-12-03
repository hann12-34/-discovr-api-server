/**
 * CODA Nightclub Events Scraper (Toronto)
 * Premier electronic music venue
 * URL: https://codatoronto.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeCodaNightclub(city = 'Toronto') {
  console.log('🎧 Scraping CODA Nightclub...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://codatoronto.com/events/', {
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
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      };
      
      // Date pattern: "December 5, 2025"
      const datePattern = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/;
      
      const seen = new Set();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[1];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          const month = months[monthStr];
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the NEXT line after the date
          let title = i + 1 < lines.length ? lines[i + 1] : null;
          
          // Skip if title looks like navigation or another date
          if (title && (
            title.match(datePattern) ||
            title === 'UPCOMING EVENTS' ||
            title.includes('Sign up') ||
            title.length < 3
          )) {
            title = null;
          }
          
          if (title && title.length > 2 && !seen.has(title + isoDate)) {
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

    console.log(`  ✅ Found ${events.length} CODA events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://codatoronto.com/events/',
      imageUrl: null,
      venue: {
        name: 'CODA',
        address: '794 Bathurst St, Toronto, ON M5R 3G1',
        city: 'Toronto'
      },
      latitude: 43.6651,
      longitude: -79.4114,
      city: 'Toronto',
      category: 'Nightlife',
      source: 'CODA'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  CODA error:', error.message);
    return [];
  }
}

module.exports = scrapeCodaNightclub;
