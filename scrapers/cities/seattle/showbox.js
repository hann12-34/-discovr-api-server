/**
 * Showbox Events Scraper (Seattle)
 * Historic Seattle music venues: The Showbox, Showbox SoDo
 * URL: https://www.showboxpresents.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeShowbox(city = 'Seattle') {
  console.log('🎤 Scraping The Showbox...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.showboxpresents.com/events', {
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
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      
      // Date pattern: "TUE, DEC 2, 2025"
      const datePattern = /^(MON|TUE|WED|THU|FRI|SAT|SUN),\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2}),\s+(\d{4})$/i;
      
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
          
          // Look backwards for the title
          let title = null;
          let venue = 'The Showbox';
          
          for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
            const candidate = lines[j];
            
            // Check for venue
            if (candidate.includes('SHOWBOX SODO')) {
              venue = 'Showbox SoDo';
              continue;
            }
            if (candidate.includes('CRYSTAL BALLROOM')) {
              venue = 'Crystal Ballroom';
              continue;
            }
            if (candidate.includes('THE SHOWBOX')) {
              venue = 'The Showbox';
              continue;
            }
            
            // Skip presenter/tour/support lines
            if (candidate.match(/Presents$/i) ||
                candidate.match(/^with\s/i) ||
                candidate.match(/TOUR\s*\d{4}$/i) ||
                candidate === 'CANCELLED' ||
                candidate === 'BUY TICKETS' ||
                candidate.match(/SHOW\s+\d+:\d+/i) ||
                candidate.length < 3) {
              continue;
            }
            
            // Found potential title - should be in CAPS or proper case
            if (candidate.length > 3) {
              title = candidate;
              break;
            }
          }
          
          // Skip cancelled events
          const isCancelled = lines.slice(Math.max(0, i-3), i).some(l => l === 'CANCELLED');
          
          if (title && title.length > 3 && !seen.has(title + isoDate) && !isCancelled) {
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

    console.log(`  ✅ Found ${events.length} Showbox events`);

    const formattedEvents = events.map(event => {
      // Venue-specific coordinates
      let lat = 47.6085, lng = -122.3402; // Default: The Showbox
      let address = '1426 1st Ave, Seattle, WA 98101';
      
      if (event.venue === 'Showbox SoDo') {
        lat = 47.5802; lng = -122.3342;
        address = '1700 1st Ave S, Seattle, WA 98134';
      }
      
      return {
        id: uuidv4(),
        title: event.title,
        date: event.date,
        startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
        url: 'https://www.showboxpresents.com/events',
        imageUrl: null,
        venue: {
          name: event.venue,
          address: address,
          city: 'Seattle'
        },
        latitude: lat,
        longitude: lng,
        city: 'Seattle',
        category: 'Nightlife',
        source: 'The Showbox'
      };
    });

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date} @ ${e.venue.name}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Showbox error:', error.message);
    return [];
  }
}

module.exports = scrapeShowbox;
