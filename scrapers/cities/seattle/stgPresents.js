/**
 * STG (Seattle Theatre Group) Events Scraper
 * Major Seattle theatres: Paramount, Moore, Neptune
 * URL: https://www.stgpresents.org/calendar
 * 
 * IMPORTANT: Detects venue from event title and assigns correct address/coordinates
 * Filters out non-Seattle locations (Renton, Remlinger Farms, etc.)
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

// STG venue locations in Seattle
const STG_VENUES = {
  'PARAMOUNT': {
    name: 'The Paramount Theatre',
    address: '911 Pine St, Seattle, WA 98101',
    lat: 47.6134,
    lng: -122.3328
  },
  'MOORE': {
    name: 'The Moore Theatre',
    address: '1932 2nd Ave, Seattle, WA 98101',
    lat: 47.6118,
    lng: -122.3413
  },
  'NEPTUNE': {
    name: 'Neptune Theatre',
    address: '1303 NE 45th St, Seattle, WA 98105',
    lat: 47.6614,
    lng: -122.3152
  },
  '5TH AVENUE': {
    name: '5th Avenue Theatre',
    address: '1308 5th Ave, Seattle, WA 98101',
    lat: 47.6087,
    lng: -122.3344
  },
  'KERRY HALL': {
    name: 'Kerry Hall at Seattle Center',
    address: '305 Harrison St, Seattle, WA 98109',
    lat: 47.6221,
    lng: -122.3517
  }
};

// Locations outside Seattle to exclude
const NON_SEATTLE_KEYWORDS = [
  'RENTON', 'GENCARE', 'REMLINGER', 'CARNATION', 'BELLEVUE', 
  'TACOMA', 'EVERETT', 'KIRKLAND', 'REDMOND', 'NORTHSHORE', 'GARFIELD'
];

function detectVenue(title) {
  const upperTitle = title.toUpperCase();
  
  // Check for non-Seattle locations first
  for (const keyword of NON_SEATTLE_KEYWORDS) {
    if (upperTitle.includes(keyword)) {
      return null; // Exclude this event
    }
  }
  
  // Try to detect specific venue from title
  if (upperTitle.includes('NEPTUNE')) return STG_VENUES['NEPTUNE'];
  if (upperTitle.includes('MOORE')) return STG_VENUES['MOORE'];
  if (upperTitle.includes('5TH AVENUE') || upperTitle.includes('FIFTH AVENUE')) return STG_VENUES['5TH AVENUE'];
  if (upperTitle.includes('KERRY HALL')) return STG_VENUES['KERRY HALL'];
  if (upperTitle.includes('PARAMOUNT')) return STG_VENUES['PARAMOUNT'];
  
  // Default to Paramount for main shows (Lion King, Elf, etc.)
  return STG_VENUES['PARAMOUNT'];
}

async function scrapeSTGPresents(city = 'Seattle') {
  console.log('🎭 Scraping STG Presents (Paramount/Moore/Neptune)...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.stgpresents.org/calendar', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const allImages = [];
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src && src.includes('http') && !src.includes('logo') && !src.includes('icon')) allImages.push(src);
      });
      let imgIdx = 0;
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'JANUARY': 0, 'FEBRUARY': 1, 'MARCH': 2, 'APRIL': 3, 'MAY': 4, 'JUNE': 5,
        'JULY': 6, 'AUGUST': 7, 'SEPTEMBER': 8, 'OCTOBER': 9, 'NOVEMBER': 10, 'DECEMBER': 11
      };
      
      // Find current month/year from calendar header - NO FALLBACK
      const monthYearMatch = bodyText.match(/(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})/);
      if (!monthYearMatch) return []; // Must have real date from page
      let currentMonth = months[monthYearMatch[1]];
      let currentYear = parseInt(monthYearMatch[2]);
      
      // Find day numbers with events
      const seen = new Set();
      let currentDay = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this is a day number in calendar (1-31)
        if (/^[1-9]$|^[12][0-9]$|^3[01]$/.test(line)) {
          currentDay = parseInt(line);
          continue;
        }
        
        // Check if this looks like an event with time
        const timeMatch = line.match(/^(\d{1,2}:\d{2}\s*(AM|PM))$/i);
        if (timeMatch && currentDay) {
          // Look for event title in next lines
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            const candidate = lines[j];
            
            // Skip day numbers, times, and navigation
            if (/^\d{1,2}$/.test(candidate) ||
                candidate.match(/^\d{1,2}:\d{2}\s*(AM|PM)/i) ||
                candidate.match(/^(SU|MO|TU|WE|TH|FR|SA)$/i) ||
                candidate === 'CALENDAR' ||
                candidate.match(/^(PARAMOUNT|MOORE|NEPTUNE|5TH AVENUE|KERRY HALL)/i) ||
                candidate.length < 5) {
              continue;
            }
            
            // Found event title!
            const title = candidate;
            const month = String(currentMonth + 1).padStart(2, '0');
            const day = String(currentDay).padStart(2, '0');
            const isoDate = `${currentYear}-${month}-${day}`;
            
            if (!seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              const imageUrl = allImages.length > 0 ? allImages[imgIdx++ % allImages.length] : null;
              results.push({
                title: title,
                date: isoDate,
                imageUrl: imageUrl
              });
            }
            break;
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} STG events`);

    // Filter to main music/performance events AND Seattle-only locations
    const filteredEvents = events.filter(e => {
      const title = e.title.toUpperCase();
      
      // Skip class/workshop type events
      if (title.includes('DANCE CLASS') || 
          title.includes('YOGA') || 
          title.includes('CLINIC') ||
          title.includes('ARCHIVE') ||
          title.includes('WORKSHOP') ||
          title.includes('OFFICE HOURS') ||
          title.includes('WELLNESS SERIES') ||
          title.includes('CREATIVE MORNINGS')) {
        return false;
      }
      
      // Skip non-Seattle locations
      const venue = detectVenue(e.title);
      if (!venue) {
        console.log(`  ❌ Excluded (non-Seattle): ${e.title.substring(0, 40)}`);
        return false;
      }
      
      return true;
    });

    console.log(`  ✅ Filtered to ${filteredEvents.length} Seattle performance events`);

    const formattedEvents = filteredEvents.map(event => {
      const venue = detectVenue(event.title);
      
      return {
        id: uuidv4(),
        title: event.title,
        date: event.date,
        startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
        url: 'https://www.stgpresents.org/calendar',
        imageUrl: event.imageUrl || null,
        venue: {
          name: venue.name,
          address: venue.address,
          city: 'Seattle'
        },
        latitude: venue.lat,
        longitude: venue.lng,
        city: 'Seattle',
        category: 'Nightlife',
        source: 'STG Presents'
      };
    });

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title.substring(0, 40)} | ${e.date} @ ${e.venue.name}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  STG Presents error:', error.message);
    return [];
  }
}

module.exports = scrapeSTGPresents;
