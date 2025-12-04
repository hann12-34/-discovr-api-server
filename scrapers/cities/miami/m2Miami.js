/**
 * M2 Miami Events Scraper
 * Historic Art Deco venue (formerly Mansion), now by Ultra Worldwide
 * URL: https://www.m2miami.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeM2Miami(city = 'Miami') {
  console.log('🎭 Scraping M2 Miami...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.m2miami.com/', {
      waitUntil: 'networkidle2',
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
      
      // Look for calendar entries: day, month, year pattern
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toUpperCase();
        
        // Check for day of week followed by day number
        if (['WED', 'THU', 'FRI', 'SAT', 'SUN', 'MON', 'TUE'].includes(line)) {
          // Next line should be day number
          const dayLine = lines[i + 1];
          // Line after should be month
          const monthLine = lines[i + 2]?.toUpperCase();
          // Line after that should be year
          const yearLine = lines[i + 3];
          
          if (dayLine && /^\d{1,2}$/.test(dayLine) && 
              monthLine && months[monthLine] &&
              yearLine && /^\d{4}$/.test(yearLine)) {
            
            const day = dayLine.padStart(2, '0');
            const month = months[monthLine];
            const year = yearLine;
            
            const isoDate = `${year}-${month}-${day}`;
            
            // Title is typically after the date block
            let title = lines[i + 4];
            
            // Skip if title looks like navigation or another date
            if (title && (
              /^(WED|THU|FRI|SAT|SUN|MON|TUE)$/i.test(title) ||
              /^\d{1,2}$/.test(title) ||
              title.length < 5
            )) {
              title = null;
            }
            
            // Skip navigation items
            if (title && (
              title.includes('VIEW CALENDAR') ||
              title.includes('GET TICKETS') ||
              title.includes('MENU')
            )) {
              continue;
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
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} M2 Miami events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.m2miami.com/',
      imageUrl: null,
      venue: {
        name: 'M2 Miami',
        address: '1235 Washington Ave, Miami Beach, FL 33139',
        city: 'Miami'
      },
      latitude: 25.7795,
      longitude: -80.1342,
      city: 'Miami',
      category: 'Nightlife',
      source: 'M2 Miami'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  M2 Miami error:', error.message);
    return [];
  }
}

module.exports = scrapeM2Miami;
