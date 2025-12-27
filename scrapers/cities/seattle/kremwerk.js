/**
 * Kremwerk Complex Events Scraper (Seattle)
 * Underground electronic music venue & queer nightclub
 * 3 Dancefloors: Kremwerk, Timbre Room, Cherry
 * URL: https://www.kremwerk.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeKremwerk(city = 'Seattle') {
  console.log('🎧 Scraping Kremwerk Complex (Kremwerk/Timbre Room/Cherry)...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Use events page for more complete listing
    await page.goto('https://www.kremwerk.com/events', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      const seen = new Set();
      
      // Find year from calendar header (e.g., "DECEMBER 2025") - NO FALLBACK
      const yearMatch = bodyText.match(/(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})/i);
      if (!yearMatch) return []; // Must have real date from page
      const currentYear = parseInt(yearMatch[2]);
      const monthNames = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
      const currentMonth = String(monthNames.indexOf(yearMatch[1].toUpperCase()) + 1).padStart(2, '0');
      
      // Pattern for event names in UPPERCASE
      const eventPattern = /^[A-Z][A-Z0-9\s\-\:\'\&\/\!\@\#\$\%\^\*\(\)]+$/;
      // Time pattern
      const timePattern = /^\d{1,2}:\d{2}\s*(AM|PM)\s*[–\-]\s*\d{1,2}:\d{2}\s*(AM|PM)$/i;
      // Venue names
      const venueNames = ['Kremwerk', 'Timbre Room', 'Cherry'];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this looks like an event title (UPPERCASE)
        if (eventPattern.test(line) && line.length > 3 && line.length < 80) {
          // Skip navigation items
          if (['KREMWERK', 'UPCOMING EVENTS', 'INFO', 'LODGING', 'MERCH', 'DECEMBER', 'JANUARY', 'FEBRUARY',
               'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SEATTLE', 'UNITED STATES'].includes(line)) {
            continue;
          }
          
          // Look for time and venue after
          let venue = 'Kremwerk';
          let foundTime = false;
          
          for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            const nextLine = lines[j];
            
            // Check for venue name
            for (const v of venueNames) {
              if (nextLine === v || nextLine.includes(v)) {
                venue = v;
              }
            }
            
            // Check for time
            if (timePattern.test(nextLine) || nextLine.match(/^\d{1,2}:\d{2}\s*(AM|PM)/i)) {
              foundTime = true;
            }
          }
          
          // Only include if we found time indicator nearby
          if (foundTime && currentMonth) {
            // Look for day number nearby (before or after title)
            let day = null;
            for (let k = Math.max(0, i - 3); k < Math.min(i + 3, lines.length); k++) {
              if (/^[1-9]$|^[12][0-9]$|^3[01]$/.test(lines[k])) {
                day = lines[k].padStart(2, '0');
                break;
              }
            }
            
            if (!day) continue;
            
            const isoDate = `${currentYear}-${currentMonth}-${day}`;
            const key = line + isoDate;
            
            if (!seen.has(key)) {
              seen.add(key);
              results.push({
                title: line,
                date: isoDate,
                venue: venue
              });
            }
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Kremwerk Complex events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.kremwerk.com/events',
      imageUrl: event.imageUrl || null,
      venue: {
        name: event.venue || 'Kremwerk',
        address: '1809 Minor Ave, Seattle, WA 98101',
        city: 'Seattle'
      },
      latitude: 47.6171,
      longitude: -122.3331,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Kremwerk'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date} @ ${e.venue.name}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Kremwerk error:', error.message);
    return [];
  }
}

module.exports = scrapeKremwerk;
