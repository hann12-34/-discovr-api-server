/**
 * Fillmore Miami Beach Events Scraper
 * Historic Jackie Gleason Theater - major concert venue
 * URL: https://www.fillmoremb.com/calendar
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeFillmoreMiami(city = 'Miami') {
  console.log('🎸 Scraping Fillmore Miami Beach...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.fillmoremb.com/calendar', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // Look for patterns like "FRI DEC 5" or "SAT DEC 6"
      const datePattern = /^(MON|TUE|WED|THU|FRI|SAT|SUN)\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})$/i;
      const todayPattern = /^TODAY\s+(\d{1,2})(AM|PM)$/i;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[2].toUpperCase();
          const day = dateMatch[3].padStart(2, '0');
          const month = months[monthStr];
          
          // Determine year
          const eventMonth = parseInt(month);
          const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the line BEFORE the date
          let title = i > 0 ? lines[i - 1] : null;
          
          // Skip if title is navigation/category
          if (title && (
            title.match(/^(HIP-HOP|ROCK|POP|JAZZ|COMEDY|R&B|ELECTRONIC|FOREIGN|LATIN)/i) ||
            title.includes('FILLMORE') ||
            title.includes('JACKIE GLEASON') ||
            title.includes('ADVERTISEMENT') ||
            title === 'SHOWS' ||
            title === 'VENUE INFO' ||
            title.length < 5
          )) {
            // Try two lines before
            title = i > 1 ? lines[i - 2] : null;
          }
          
          // Still navigation?
          if (title && (
            title.match(/^(HIP-HOP|ROCK|POP|JAZZ|COMEDY|R&B|ELECTRONIC|FOREIGN|LATIN)/i) ||
            title.includes('FILLMORE')
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

    console.log(`  ✅ Found ${events.length} Fillmore Miami events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.fillmoremb.com/calendar',
      imageUrl: null,
      venue: {
        name: 'Fillmore Miami Beach',
        address: '1700 Washington Ave, Miami Beach, FL 33139',
        city: 'Miami'
      },
      latitude: 25.7907,
      longitude: -80.1351,
      city: 'Miami',
      category: 'Nightlife',
      source: 'Fillmore Miami'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Fillmore Miami error:', error.message);
    return [];
  }
}

module.exports = scrapeFillmoreMiami;
