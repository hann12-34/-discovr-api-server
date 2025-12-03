/**
 * Conor Byrne Pub Events Scraper (Seattle)
 * Ballard neighborhood Irish pub with live music
 * URL: https://www.conorbyrnepub.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeConorByrnePub(city = 'Seattle') {
  console.log('🍀 Scraping Conor Byrne Pub...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.conorbyrnepub.com/events', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      const seen = new Set();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this is a day of week
        if (days.includes(line)) {
          // Next line should be "Dec 2" format
          const dateMatch = lines[i + 1]?.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i);
          
          if (dateMatch) {
            const monthStr = dateMatch[1];
            const day = dateMatch[2].padStart(2, '0');
            const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()];
            
            // Determine year
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            const eventMonth = parseInt(month);
            const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
            
            const isoDate = `${year}-${month}-${day}`;
            
            // Look for event title after time (e.g., "8:00 PM")
            for (let j = i + 2; j < Math.min(i + 6, lines.length); j++) {
              const candidate = lines[j];
              
              // Skip time and price lines
              if (candidate.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i) ||
                  candidate === 'TICKETS' ||
                  candidate === 'FREE' ||
                  candidate === 'SUGGESTED DONATION' ||
                  candidate.length < 5) {
                continue;
              }
              
              // Found event title
              if (!seen.has(candidate + isoDate)) {
                seen.add(candidate + isoDate);
                results.push({
                  title: candidate,
                  date: isoDate
                });
              }
              break;
            }
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Conor Byrne Pub events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.conorbyrnepub.com/events',
      imageUrl: null,
      venue: {
        name: 'Conor Byrne Pub',
        address: '5140 Ballard Ave NW, Seattle, WA 98107',
        city: 'Seattle'
      },
      latitude: 47.6656,
      longitude: -122.3842,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Conor Byrne Pub'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title.substring(0, 50)} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Conor Byrne Pub error:', error.message);
    return [];
  }
}

module.exports = scrapeConorByrnePub;
