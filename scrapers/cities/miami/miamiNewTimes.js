/**
 * Miami New Times Events Scraper - REAL Puppeteer
 * Local Miami events aggregator
 * URL: https://www.miaminewtimes.com/calendar
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeMiamiNewTimes(city = 'Miami') {
  console.log('📰 Scraping Miami New Times Events...');

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

    await page.goto('https://www.miaminewtimes.com/calendar', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll to load more
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };

      const items = document.querySelectorAll('.event-row, .calendar-event, article, [class*="event"]');
      
      items.forEach(item => {
        const text = item.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let title = null;
        let venue = null;
        for (const line of lines) {
          // Skip date/time strings, navigation items, addresses, and generic text
          if (line.length > 12 && line.length < 100 && 
              !line.match(/^(read more|share|free|\$|view|miami|sun\.|mon\.|tue\.|wed\.|thu\.|fri\.|sat\.)/i) &&
              !line.match(/^\d{1,2}:\d{2}\s*(am|pm)?$/i) &&
              !line.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) &&
              !line.match(/^\d+\s+(N|S|E|W|NE|NW|SE|SW)?\s*\w+\s+(St|Ave|Blvd|Rd|Dr|Ln|Way|Ct)/i) &&
              !line.match(/^(hard rock|kaseya|neighborhood)/i) &&
              !line.match(/Biscayne|Blvd\.|Downtown/i)) {
            if (!title) {
              title = line;
            } else if (!venue && line.length > 3 && !line.match(/^\d/)) {
              // Second valid line might be venue - but not if it starts with number (address)
              venue = line;
            }
          }
        }
        
        const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i)
          || text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        
        if (title && dateMatch) {
          let isoDate;
          if (dateMatch[0].includes('/')) {
            const month = dateMatch[1].padStart(2, '0');
            const day = dateMatch[2].padStart(2, '0');
            let year = dateMatch[3];
            if (year.length === 2) year = '20' + year;
            isoDate = `${year}-${month}-${day}`;
          } else {
            const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
            const day = dateMatch[2];
            const year = dateMatch[3] || currentYear;
            const month = months[monthStr];
            if (month) isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
          }
          
          // Only include if we have a valid title (not a date/time)
          if (isoDate && title && !seen.has(title + isoDate) && 
              !title.match(/^\d/) && title.length > 10) {
            seen.add(title + isoDate);
            results.push({ title: title.substring(0, 100), date: isoDate, venue: venue });
          }
        }
      });
      
      return results;
    });

    allEvents.push(...events);
    await browser.close();
    
    console.log(`  ✅ Found ${allEvents.length} Miami New Times events`);

    // Venue address lookup - REQUIRED per rules (no generic addresses)
    const venueAddresses = {
      'club space': { address: '34 NE 11th St, Miami, FL 33132', lat: 25.7889, lng: -80.1917 },
      'e11even': { address: '29 NE 11th St, Miami, FL 33132', lat: 25.7886, lng: -80.1920 },
      'liv': { address: '4441 Collins Ave, Miami Beach, FL 33140', lat: 25.8195, lng: -80.1224 },
      'story': { address: '136 Collins Ave, Miami Beach, FL 33139', lat: 25.7806, lng: -80.1301 },
      'basement': { address: '2901 Collins Ave, Miami Beach, FL 33140', lat: 25.8010, lng: -80.1270 },
      'do not sit': { address: '423 16th St, Miami Beach, FL 33139', lat: 25.7909, lng: -80.1367 },
      'treehouse': { address: '323 23rd St, Miami Beach, FL 33139', lat: 25.7967, lng: -80.1341 },
      'floyd': { address: '34 NE 11th St, Miami, FL 33132', lat: 25.7889, lng: -80.1917 },
      'the ground': { address: '34 NE 11th St, Miami, FL 33132', lat: 25.7889, lng: -80.1917 },
      'kaseya center': { address: '601 Biscayne Blvd, Miami, FL 33132', lat: 25.7814, lng: -80.1870 },
      'hard rock': { address: '1 Seminole Way, Hollywood, FL 33314', lat: 26.0515, lng: -80.2111 },
      'fillmore': { address: '1700 Washington Ave, Miami Beach, FL 33139', lat: 25.7913, lng: -80.1372 },
      'space park': { address: '298 NE 61st St, Miami, FL 33137', lat: 25.8307, lng: -80.1934 },
      'racket': { address: '150 NW 24th St, Miami, FL 33127', lat: 25.8002, lng: -80.1992 },
      'gramps': { address: '176 NW 24th St, Miami, FL 33127', lat: 25.8002, lng: -80.1996 }
    };

    // Filter out events without proper venue info, then match to known venues
    const validEvents = allEvents.filter(e => e.venue && e.venue.length > 3);
    console.log(`  📍 ${validEvents.length} events have venue info`);
    
    const formattedEvents = validEvents
      .filter(event => {
        const venueLower = event.venue.toLowerCase();
        return Object.keys(venueAddresses).some(v => venueLower.includes(v));
      })
      .map(event => {
        const venueLower = event.venue.toLowerCase();
        const matchedVenue = Object.keys(venueAddresses).find(v => venueLower.includes(v));
        const venueInfo = venueAddresses[matchedVenue];
        
        if (!venueInfo) return null;
        
        return {
          id: uuidv4(),
          title: event.title,
        description: '',
          date: event.date,
          startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
          url: 'https://www.miaminewtimes.com/calendar',
          imageUrl: null,
          venue: { name: event.venue, address: venueInfo.address, city: 'Miami' },
          latitude: venueInfo.lat,
          longitude: venueInfo.lng,
          city: 'Miami',
          category: 'Nightlife',
          source: 'MiamiNewTimes'
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
    console.error('  ⚠️  Miami New Times error:', error.message);
    return [];
  }
}

module.exports = scrapeMiamiNewTimes;
