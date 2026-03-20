/**
 * The Stranger Events Scraper - REAL Puppeteer
 * Seattle's premier alternative events calendar
 * URL: https://www.thestranger.com/events/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTheStranger(city = 'Seattle') {
  console.log('📰 Scraping The Stranger Events...');

  let browser;
  const allEvents = [];
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Scrape multiple categories
    const urls = [
      'https://www.thestranger.com/events/music',
      'https://www.thestranger.com/events/clubs',
      'https://www.thestranger.com/events/performance'
    ];

    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Scroll to load more
        for (let i = 0; i < 2; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const events = await page.evaluate(() => {
          const results = [];
          const seen = new Set();
          // NO new Date() - year must come from page
          const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };

          const items = document.querySelectorAll('.event-row, .event-listing, article, [class*="event"], .listing');
          
          items.forEach(item => {
            const text = item.innerText;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            let title = null;
            let venue = null;
            for (const line of lines) {
              if (line.length > 5 && line.length < 100 && 
                  !line.match(/^(read more|share|free|\$|view|seattle|tonight|tomorrow)/i)) {
                if (!title) {
                  title = line;
                } else if (!venue && line.length > 3 && !line.match(/^\d/) && !line.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
                  // Second valid line might be venue
                  venue = line;
                }
              }
            }
            
            const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i)
              || text.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/i);
            
            if (title && dateMatch) {
              let monthStr, day, year;
              if (dateMatch[0].match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i)) {
                if (!dateMatch[4]) return; // Skip if no year
                monthStr = dateMatch[2].toLowerCase().slice(0, 3);
                day = dateMatch[3];
                year = dateMatch[4];
              } else {
                if (!dateMatch[3]) return; // Skip if no year
                monthStr = dateMatch[1].toLowerCase().slice(0, 3);
                day = dateMatch[2];
                year = dateMatch[3];
              }
              
              const month = months[monthStr];
              if (month && venue) {  // Only include events with venue
                const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
                if (!seen.has(title + isoDate)) {
                  seen.add(title + isoDate);
                  results.push({ title: title.substring(0, 100), date: isoDate, venue: venue.substring(0, 80) });
                }
              }
            }
          });
          
          return results;
        });

        allEvents.push(...events);
        console.log(`   ${url.split('/').pop()}: ${events.length} events`);
      } catch (err) {
        console.log(`   ⚠️ ${url.split('/').pop()}: ${err.message.substring(0, 40)}`);
      }
    }

    await browser.close();

    // Dedupe
    const seen = new Set();
    const uniqueEvents = allEvents.filter(e => {
      const key = e.title + e.date;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log(`  ✅ Found ${uniqueEvents.length} The Stranger events`);

    // Venue address lookup - REQUIRED per rules (no generic addresses)
    const venueAddresses = {
      'neumos': { address: '925 E Pike St, Seattle, WA 98122', lat: 47.6145, lng: -122.3197 },
      'the crocodile': { address: '2505 1st Ave, Seattle, WA 98121', lat: 47.6136, lng: -122.3476 },
      'showbox': { address: '1426 1st Ave, Seattle, WA 98101', lat: 47.6082, lng: -122.3396 },
      'showbox sodo': { address: '1700 1st Ave S, Seattle, WA 98134', lat: 47.5857, lng: -122.3345 },
      'tractor tavern': { address: '5213 Ballard Ave NW, Seattle, WA 98107', lat: 47.6654, lng: -122.3821 },
      'el corazon': { address: '109 Eastlake Ave E, Seattle, WA 98109', lat: 47.6205, lng: -122.3267 },
      'nectar lounge': { address: '412 N 36th St, Seattle, WA 98103', lat: 47.6518, lng: -122.3510 },
      'the vera project': { address: '305 Harrison St, Seattle, WA 98109', lat: 47.6219, lng: -122.3516 },
      'chop suey': { address: '1325 E Madison St, Seattle, WA 98122', lat: 47.6149, lng: -122.3135 },
      'kremwerk': { address: '1809 Minor Ave, Seattle, WA 98101', lat: 47.6177, lng: -122.3334 },
      'barboza': { address: '925 E Pike St, Seattle, WA 98122', lat: 47.6145, lng: -122.3197 },
      'clock-out lounge': { address: '4864 Beacon Ave S, Seattle, WA 98108', lat: 47.5592, lng: -122.3106 },
      'triple door': { address: '216 Union St, Seattle, WA 98101', lat: 47.6080, lng: -122.3370 },
      'central saloon': { address: '207 1st Ave S, Seattle, WA 98104', lat: 47.6006, lng: -122.3339 },
      'conor byrne': { address: '5140 Ballard Ave NW, Seattle, WA 98107', lat: 47.6651, lng: -122.3823 },
      'sunset tavern': { address: '5433 Ballard Ave NW, Seattle, WA 98107', lat: 47.6657, lng: -122.3825 },
      'high dive': { address: '513 N 36th St, Seattle, WA 98103', lat: 47.6522, lng: -122.3514 },
      'jazz alley': { address: '2033 6th Ave, Seattle, WA 98121', lat: 47.6152, lng: -122.3406 },
      'substation': { address: '645 NW 45th St, Seattle, WA 98107', lat: 47.6612, lng: -122.3643 },
      'moore theatre': { address: '1932 2nd Ave, Seattle, WA 98101', lat: 47.6130, lng: -122.3413 },
      'paramount theatre': { address: '911 Pine St, Seattle, WA 98101', lat: 47.6134, lng: -122.3319 },
      'climate pledge arena': { address: '334 1st Ave N, Seattle, WA 98109', lat: 47.6222, lng: -122.3540 }
    };

    // Only include events with known venue addresses
    const formattedEvents = uniqueEvents
      .filter(event => {
        const venueLower = event.venue.toLowerCase();
        return Object.keys(venueAddresses).some(v => venueLower.includes(v));
      })
      .map(event => {
        const venueLower = event.venue.toLowerCase();
        const matchedVenue = Object.keys(venueAddresses).find(v => venueLower.includes(v));
        const venueInfo = venueAddresses[matchedVenue] || null;
        
        if (!venueInfo) return null;
        
        return {
          id: uuidv4(),
          title: event.title,
        description: '',
          date: event.date,
          startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
          url: 'https://www.thestranger.com/events/',
          imageUrl: null,
          venue: { name: event.venue, address: venueInfo.address, city: 'Seattle' },
          latitude: venueInfo.lat,
          longitude: venueInfo.lng,
          city: 'Seattle',
          category: 'Nightlife',
          source: 'TheStranger'
        };
      })
      .filter(e => e !== null);
    
    console.log(`  📋 ${formattedEvents.length} events with valid venue addresses`);

    formattedEvents.slice(0, 15).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));

      // Fetch descriptions from event detail pages
      for (const event of formattedEvents) {
        if (event.description || !event.url || !event.url.startsWith('http')) continue;
        try {
          const _r = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const _$ = cheerio.load(_r.data);
          let _desc = _$('meta[property="og:description"]').attr('content') || '';
          if (!_desc || _desc.length < 20) {
            _desc = _$('meta[name="description"]').attr('content') || '';
          }
          if (!_desc || _desc.length < 20) {
            for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p', '.page-content p']) {
              const _t = _$(_s).first().text().trim();
              if (_t && _t.length > 30) { _desc = _t; break; }
            }
          }
          if (_desc) {
            _desc = _desc.replace(/\s+/g, ' ').trim();
            if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
            event.description = _desc;
          }
        } catch (_e) { /* skip */ }
      }

    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  The Stranger error:', error.message);
    return [];
  }
}

module.exports = scrapeTheStranger;
