/**
 * Nectar Lounge Events Scraper (Seattle)
 * Fremont neighborhood live music venue
 * Also includes Hidden Hall events
 * URL: https://nectarlounge.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeNectarLounge(city = 'Seattle') {
  console.log('🍯 Scraping Nectar Lounge...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://nectarlounge.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      
      const seen = new Set();
      
      // Pattern: Day (TUE), Month (DEC), Day Number (02), Year (2025)
      for (let i = 0; i < lines.length - 4; i++) {
        const dayOfWeek = lines[i];
        const monthStr = lines[i + 1];
        const dayNum = lines[i + 2];
        const yearStr = lines[i + 3];
        
        // Check if this matches our date pattern
        if (['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].includes(dayOfWeek) &&
            months[monthStr] &&
            /^\d{1,2}$/.test(dayNum) &&
            /^\d{4}$/.test(yearStr)) {
          
          const month = months[monthStr];
          const day = dayNum.padStart(2, '0');
          const year = yearStr;
          const isoDate = `${year}-${month}-${day}`;
          
          // Look for event title after the date block
          for (let j = i + 4; j < Math.min(i + 10, lines.length); j++) {
            const candidate = lines[j];
            
            // Skip presenter lines
            if (candidate.match(/presents?:$/i) ||
                candidate.match(/^\d+:\d+\s*(AM|PM)$/i) ||
                candidate === 'TICKETS' ||
                candidate.match(/^Ages \d+\+$/i) ||
                candidate === 'Nectar Lounge' ||
                candidate === 'Hidden Hall' ||
                candidate.length < 5) {
              continue;
            }
            
            // Found event title
            if (!seen.has(candidate + isoDate)) {
              seen.add(candidate + isoDate);
              
              // Check if it's at Hidden Hall or Nectar Lounge
              let venue = 'Nectar Lounge';
              for (let k = j; k < Math.min(j + 5, lines.length); k++) {
                if (lines[k] === 'Hidden Hall') {
                  venue = 'Hidden Hall';
                  break;
                }
              }
              
              results.push({
                title: candidate,
                date: isoDate,
                venue: venue
              });
              break;
            }
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Nectar Lounge events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://nectarlounge.com/',
      imageUrl: null,
      venue: {
        name: event.venue,
        address: '412 N 36th St, Seattle, WA 98103',
        city: 'Seattle'
      },
      latitude: 47.6516,
      longitude: -122.3505,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Nectar Lounge'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title.substring(0, 50)} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Nectar Lounge error:', error.message);
    return [];
  }
}

module.exports = scrapeNectarLounge;
