/**
 * YES Manchester Events Scraper
 * Multi-floor venue in Manchester city centre
 * URL: https://www.yes-manchester.com/whats-on
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeYesManchester(city = 'Manchester') {
  console.log('🎵 Scraping YES Manchester...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.yes-manchester.com/whats-on', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      
      // Pattern: "FRI 9 JAN" or "SAT 10 JAN"
      const datePattern = /^(MON|TUE|WED|THU|FRI|SAT|SUN)\s+(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i;
      
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      for (let i = 0; i < lines.length - 1; i++) {
        const dateMatch = lines[i].match(datePattern);
        
        if (dateMatch) {
          const day = dateMatch[2].padStart(2, '0');
          const monthStr = dateMatch[3].toUpperCase();
          const month = months[monthStr];
          
          let year = currentYear;
          if (parseInt(month) < currentMonth) {
            year = currentYear + 1;
          }
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the next line
          let title = lines[i + 1];
          
          // Get venue room from following line if present
          let room = null;
          if (lines[i + 2] && lines[i + 2].match(/^(BASEMENT|THE PINK ROOM|MAIN ROOM)/i)) {
            room = lines[i + 2].split('–')[0].trim();
          }
          
          if (title && 
              title.length > 3 && 
              title.length < 200 &&
              !title.match(/^(BUY|TICKETS|VIEW|MORE|MONTH|BACK|WHAT)/i) &&
              !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            
            // Clean up title - remove "HOT TAKE:" prefix and similar
            title = title.replace(/^HOT TAKE:\s*/i, '').replace(/^LIVE:\s*/i, '');
            
            results.push({ 
              title, 
              date: isoDate,
              room: room
            });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    const now = new Date();
    const formattedEvents = events
      .filter(e => new Date(e.date) >= now)
      .map(event => ({
        id: uuidv4(),
        title: event.title,
        description: event.room ? `${event.room} event` : null,
        date: event.date,
        startDate: new Date(event.date + 'T19:00:00'),
        url: 'https://www.yes-manchester.com/whats-on',
        imageUrl: null,
        venue: {
          name: 'YES',
          address: '38 Charles Street, Manchester M1 7DB',
          city: 'Manchester'
        },
        latitude: 53.4764,
        longitude: -2.2366,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'YES Manchester'
      }));

    console.log(`  ✅ Found ${formattedEvents.length} YES Manchester events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  YES Manchester error:', error.message);
    return [];
  }
}

module.exports = scrapeYesManchester;
