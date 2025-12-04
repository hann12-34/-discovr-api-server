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

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      // Pattern: "Wed 3 Dec" or "Thu 4 Dec"
      const datePattern = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;
      
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const day = dateMatch[2].padStart(2, '0');
          const monthStr = dateMatch[3];
          const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()];
          
          // Determine year
          const eventMonth = parseInt(month);
          const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Look for title after the date (skip time info)
          let title = null;
          let venue = 'Club Space Miami';
          
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j];
            
            // Skip time patterns
            if (nextLine.match(/^\d{1,2}:\d{2}(am|pm)/i) || 
                nextLine.match(/^(From)?\$[\d.]+/)) {
              continue;
            }
            
            // Detect venue
            if (nextLine.includes('Floyd')) {
              venue = 'Floyd Miami';
            } else if (nextLine.includes('Ground')) {
              venue = 'The Ground Miami';
            }
            
            // Skip navigation
            if (nextLine === 'BUY NOW' || 
                nextLine === 'JOIN THE WAITING LIST' ||
                nextLine === 'Miami' ||
                nextLine.length < 5) {
              continue;
            }
            
            title = nextLine;
            break;
          }
          
          if (title && title.length > 3 && !seen.has(title + isoDate)) {
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
        url: 'https://clubspace.com/events/',
        imageUrl: null,
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
