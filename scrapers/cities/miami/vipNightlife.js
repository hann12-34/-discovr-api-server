/**
 * VIP Nightlife Events Scraper (Miami)
 * Aggregates yacht parties, club events, and nightlife in Miami
 * URL: https://vipnightlife.com/miami/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeVipNightlife(city = 'Miami') {
  console.log('🛥️  Scraping VIP Nightlife Miami...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://vipnightlife.com/miami/events/', {
      waitUntil: 'networkidle0',
      timeout: 90000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Scroll to load more events
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 2000));

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
      
      // Pattern: "DEC" followed by day number "31"
      for (let i = 0; i < lines.length; i++) {
        const monthLine = lines[i].toUpperCase();
        
        if (months[monthLine]) {
          const dayLine = lines[i + 1];
          
          if (dayLine && /^\d{1,2}$/.test(dayLine)) {
            const month = months[monthLine];
            const day = dayLine.padStart(2, '0');
            
            // Determine year
            const eventMonth = parseInt(month);
            const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
            
            const isoDate = `${year}-${month}-${day}`;
            
            // Title is the line after the day
            let title = lines[i + 2];
            
            // Skip if title looks like navigation
            if (title && (
              title === 'More info' ||
              title === 'Miami Events' ||
              title.length < 5
            )) {
              continue;
            }
            
            // Detect event type from title
            let eventType = 'Club';
            if (title) {
              if (title.match(/YACHT|CRUISE|BOAT|FIREWORKS/i)) {
                eventType = 'Yacht Party';
              } else if (title.match(/NYE|NEW YEAR/i)) {
                eventType = 'NYE';
              }
            }
            
            if (title && title.length > 3 && !seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              results.push({
                title: title,
                date: isoDate,
                eventType: eventType
              });
            }
          }
        }
      }
      
      return results;
    });

    await browser.close();

    // Filter out Fort Lauderdale events (we only want Miami)
    const miamiEvents = events.filter(e => 
      !e.title.includes('FORT LAUDERDALE') && 
      !e.title.includes('FT LAUDERDALE')
    );

    console.log(`  ✅ Found ${miamiEvents.length} VIP Nightlife events`);

    const formattedEvents = miamiEvents.map(event => {
      // Determine venue based on event title
      let venue = 'Various Venues Miami';
      let address = 'Miami, FL';
      let lat = 25.7617, lng = -80.1918;
      
      if (event.title.match(/E11EVEN/i)) {
        venue = 'E11EVEN Miami';
        address = '29 NE 11th St, Miami, FL 33132';
        lat = 25.7891; lng = -80.1914;
      } else if (event.title.match(/YACHT|CRUISE|BOAT|SOUTH BEACH LADY/i)) {
        venue = 'Miami Yacht Party';
        address = 'Bayside Marina, Miami, FL';
        lat = 25.7764; lng = -80.1863;
      } else if (event.title.match(/UNKOMMON/i)) {
        venue = 'unKommon Events Miami';
        address = 'Miami, FL';
      } else if (event.title.match(/LIV/i)) {
        venue = 'LIV Miami';
        address = '4441 Collins Ave, Miami Beach, FL 33140';
        lat = 25.8195; lng = -80.1225;
      }
      
      return {
        id: uuidv4(),
        title: event.title,
        date: event.date,
        startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
        url: 'https://vipnightlife.com/miami/events/',
        imageUrl: null,
        venue: {
          name: venue,
          address: address,
          city: 'Miami'
        },
        latitude: lat,
        longitude: lng,
        city: 'Miami',
        category: 'Nightlife',
        source: 'VIP Nightlife'
      };
    });

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  VIP Nightlife error:', error.message);
    return [];
  }
}

module.exports = scrapeVipNightlife;
