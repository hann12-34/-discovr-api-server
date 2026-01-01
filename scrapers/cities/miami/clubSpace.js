/**
 * Club Space Events Scraper (Miami)
 * Legendary 24-hour electronic music club in Downtown Miami
 * Includes: Club Space, Floyd, The Ground
 * URL: https://clubspace.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeClubSpace(city = 'Miami') {
  console.log('🌴 Scraping Club Space Miami...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://clubspace.com/events/', {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Scroll to load all events
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // Find all event containers - they contain both title and image
      // Club Space uses a specific structure - find containers with both img and date text
      const allContainers = document.querySelectorAll('div, article, section');
      
      allContainers.forEach(container => {
        const text = container.innerText || '';
        const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;
        const dateMatch = text.match(datePattern);
        
        if (!dateMatch) return;
        
        // Check if this container has an image from dice-media (actual event images)
        const img = container.querySelector('img[src*="dice-media"]');
        if (!img) return;
        
        const imageUrl = img.src;
        
        // Get title - usually the first substantial text line after filtering
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        let title = null;
        for (const line of lines) {
          if (line.length > 5 && line.length < 100 &&
              !line.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d/i) &&
              !line.match(/^\d{1,2}:\d{2}(am|pm)/i) &&
              !line.match(/^(From)?\s*\$[\d.]+/i) &&
              !line.match(/^From\$\d/i) &&
              !line.match(/^(BUY NOW|JOIN|WAITING|SOLD OUT|EVENTS|CHECK OUT|PHOTOS|RESIDENTS|ABOUT|CONTACT|FAQ)/i) &&
              !line.match(/^(Club Space|Floyd|Ground|THE GROUND|HILLS)/i)) {
            title = line;
            break;
          }
        }
        
        if (!title || title.length < 4) return;
        
        // Parse date
        const day = dateMatch[2].padStart(2, '0');
        const monthStr = dateMatch[3];
        const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()];
        if (!month) return;
        
        const eventMonth = parseInt(month);
        const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
        const isoDate = `${year}-${month}-${day}`;
        
        // Determine venue
        let venue = 'Club Space Miami';
        const textLower = text.toLowerCase();
        if (textLower.includes('floyd')) venue = 'Floyd Miami';
        else if (textLower.includes('ground')) venue = 'The Ground Miami';
        
        const key = title + isoDate;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ title, date: isoDate, venue, imageUrl });
        }
      });
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Club Space events`);

    // Venue coordinates
    const venueInfo = {
      'Club Space Miami': { lat: 25.7889, lng: -80.1917, address: '34 NE 11th St, Miami, FL 33132' },
      'Floyd Miami': { lat: 25.7889, lng: -80.1917, address: '34 NE 11th St, Miami, FL 33132' },
      'The Ground Miami': { lat: 25.7889, lng: -80.1917, address: '34 NE 11th St, Miami, FL 33132' }
    };

    const formattedEvents = events.map(event => {
      const info = venueInfo[event.venue] || venueInfo['Club Space Miami'];
      return {
        id: uuidv4(),
        title: event.title,
        date: event.date,
        startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
        url: event.eventUrl,
        imageUrl: event.imageUrl || null,
        venue: {
          name: event.venue,
          address: info.address,
          city: 'Miami'
        },
        latitude: info.lat,
        longitude: info.lng,
        city: 'Miami',
        category: 'Nightlife',
        source: 'Club Space'
      };
    });

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date} @ ${e.venue.name}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Club Space error:', error.message);
    return [];
  }
}

module.exports = scrapeClubSpace;
