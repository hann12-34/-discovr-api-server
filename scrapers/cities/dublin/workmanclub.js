/**
 * Workman's Club Dublin Events Scraper
 * Live music and club venue
 * URL: https://theworkmansclub.com/events/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeWorkmansClub(city = 'Dublin') {
  console.log('🎸 Scraping Workman\'s Club Dublin...');

  try {
    const response = await axios.get('https://theworkmansclub.com/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Parse event links - format: [01Feb   Jenny Greene and Ejeca 11:00pm](url)
    $('a[href*="/events/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();
        
        // Skip buy ticket links and non-event links
        if (!href || href.includes('fatsoma') || href.includes('ticketmaster') || 
            href.includes('ticketbooth') || href.includes('universe.com') ||
            text === 'BUY TICKET' || text.startsWith('€') || text.startsWith('From €') ||
            text === 'Free Entry') return;
        
        // Match pattern: "01Feb   Event Name 11:00pm" or similar
        const dateMatch = text.match(/^(\d{1,2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(.+?)(?:\s+\d{1,2}:\d{2}(?:am|pm)?)?(?:\s+\(.*\))?$/i);
        
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const monthStr = dateMatch[2].toLowerCase().substring(0, 3);
          const month = months[monthStr];
          const title = dateMatch[3].trim();
          
          // Determine year - if month is before current month, it's next year
          const eventMonth = parseInt(month) - 1;
          const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
          const isoDate = `${year}-${month}-${day}`;
          
          // Skip past events
          if (new Date(isoDate) < new Date()) return;
          
          // Skip if title is too short or just a price
          if (!title || title.length < 3) return;
          
          const url = href.startsWith('http') ? href : `https://theworkmansclub.com${href}`;
          
          events.push({
            id: uuidv4(),
            title: title,
            date: isoDate,
            url: url,
            venue: {
              name: "Workman's Club",
              address: '10 Wellington Quay, Dublin D02 VH29',
              city: 'Dublin'
            },
            latitude: 53.3456,
            longitude: -6.2647,
            city: 'Dublin',
            category: 'Nightlife',
            source: "Workman's Club"
          });
        }
      } catch (e) {}
    });

    // Deduplicate by title + date
    const seen = new Set();
    const uniqueEvents = events.filter(e => {
      const key = `${e.title}|${e.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Fetch og:image for each event
    for (const event of uniqueEvents) {
      try {
        const eventPage = await axios.get(event.url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 10000
        });
        const $event = cheerio.load(eventPage.data);
        const ogImage = $event('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http') && !ogImage.includes('placeholder')) {
          event.imageUrl = ogImage;
        }
      } catch (e) {}
    }

    console.log(`  ✅ Found ${uniqueEvents.length} valid Workman's Club events`);
    return uniqueEvents;

  } catch (error) {
    console.error('  ⚠️ Workman\'s Club error:', error.message);
    return [];
  }
}

module.exports = scrapeWorkmansClub;
