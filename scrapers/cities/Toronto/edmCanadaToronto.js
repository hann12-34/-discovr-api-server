/**
 * EDM Canada Toronto Events Scraper
 * URL: https://www.edmcanada.com/toronto
 * Aggregator for EDM/electronic events across Toronto venues
 * Extracts events directly from links to get real ticket URLs
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const EdmCanadaTorontoEvents = {
  async scrape(city = 'Toronto') {
    console.log('🎧 Scraping EDM Canada Toronto...');

    try {
      const response = await axios.get('https://www.edmcanada.com/toronto', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      const months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };

      // Only venues with verified real street addresses in Toronto
      const venueMap = {
        'history': { name: 'History', address: '1663 Queen St E, Toronto, ON M4L 1G5' },
        'rebel': { name: 'Rebel', address: '11 Polson St, Toronto, ON M5A 1A4' },
        'noir': { name: 'NOIR (inside Rebel)', address: '11 Polson St, Toronto, ON M5A 1A4' },
        'coda': { name: 'CODA', address: '794 Bathurst St, Toronto, ON M5S 2R6' },
        'dprtmnt': { name: 'DPRTMNT', address: '461 King St W, Toronto, ON M5V 1K4' },
        'mod club': { name: 'Mod Club', address: '722 College St, Toronto, ON M6G 1C2' },
        'the mod club': { name: 'Mod Club', address: '722 College St, Toronto, ON M6G 1C2' },
        'phoenix concert theatre': { name: 'Phoenix Concert Theatre', address: '410 Sherbourne St, Toronto, ON M4X 1K2' },
        'phoenix': { name: 'Phoenix Concert Theatre', address: '410 Sherbourne St, Toronto, ON M4X 1K2' },
        'danforth music hall': { name: 'Danforth Music Hall', address: '147 Danforth Ave, Toronto, ON M4K 1N2' },
        'danforth': { name: 'Danforth Music Hall', address: '147 Danforth Ave, Toronto, ON M4K 1N2' },
        'massey hall': { name: 'Massey Hall', address: '178 Victoria St, Toronto, ON M5B 1T7' },
        'budweiser stage': { name: 'Budweiser Stage', address: '909 Lake Shore Blvd W, Toronto, ON M6K 3L3' },
        'rbc amphitheatre': { name: 'RBC Amphitheatre', address: '909 Lake Shore Blvd W, Toronto, ON M6K 3L3' },
        'rbc amphiteatre': { name: 'RBC Amphitheatre', address: '909 Lake Shore Blvd W, Toronto, ON M6K 3L3' },
        'scotiabank arena': { name: 'Scotiabank Arena', address: '40 Bay St, Toronto, ON M5J 2X2' },
        'rogers centre': { name: 'Rogers Centre', address: '1 Blue Jays Way, Toronto, ON M5V 1J1' },
        'woodbine park': { name: 'Woodbine Park', address: '1695 Lake Shore Blvd E, Toronto, ON M4L 1A9' },
        'downsview park': { name: 'Downsview Park', address: '70 Canuck Ave, Toronto, ON M3K 2C5' },
        'velvet underground': { name: 'Velvet Underground', address: '508 Queen St W, Toronto, ON M5V 2B3' },
        'opera house': { name: 'Opera House', address: '735 Queen St E, Toronto, ON M4M 1H1' },
        'the garrison': { name: 'The Garrison', address: '1197 Dundas St W, Toronto, ON M6J 1X3' },
        'lee\'s palace': { name: 'Lee\'s Palace', address: '529 Bloor St W, Toronto, ON M5S 1Y5' },
        'horseshoe tavern': { name: 'Horseshoe Tavern', address: '370 Queen St W, Toronto, ON M5V 2A2' },
        'the great hall': { name: 'The Great Hall', address: '1087 Queen St W, Toronto, ON M6J 1H3' },
        'longboat hall': { name: 'Longboat Hall', address: '1087 Queen St W, Toronto, ON M6J 1H3' },
        'el mocambo': { name: 'El Mocambo', address: '464 Spadina Ave, Toronto, ON M5T 2G8' },
        'toy factory': { name: 'Toy Factory', address: '137 Roncesvalles Ave, Toronto, ON M6R 2L2' },
        'runnymede hall': { name: 'Runnymede Hall', address: '2178 Bloor St W, Toronto, ON M6S 1M8' },
        '131 mccormack street': { name: '131 McCormack Street', address: '131 McCormack St, Toronto, ON' },
        'nest': { name: 'Nest Nightclub', address: '423 College St, Toronto, ON M5T 1T1' },
      };

      const currentYear = new Date().getFullYear();

      // Extract events directly from <a> links with ticket URLs
      const eventPattern = /(?:MON|TUE|WED|THU|FRI|SAT|SUN),\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2})(?:ST|ND|RD|TH)?\s*-\s*(.+?)@\s*(.+)/i;

      $('a[href]').each((i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href') || '';

        // Must have a real ticket URL
        if (!href || href === '#') return;
        if (!href.includes('ticketmaster') && !href.includes('tixr.com') &&
            !href.includes('ticketweb') && !href.includes('edmcanada.com/')) return;

        const m = text.match(eventPattern);
        if (!m) return;

        const monthName = m[1].toLowerCase();
        const day = m[2].padStart(2, '0');
        let title = m[3].trim();
        let venueName = m[4].replace(/BUY$/i, '').replace(/\s+/g, ' ').trim();

        const monthNum = months[monthName];
        if (!monthNum) return;

        let year = currentYear;
        if (parseInt(monthNum) < new Date().getMonth()) year++;
        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < new Date()) return;

        // Must match a known venue with a real address — skip unknown venues
        const venueKey = Object.keys(venueMap).find(k => venueName.toLowerCase().includes(k));
        if (!venueKey) return;
        const venue = venueMap[venueKey];

        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Resolve the actual ticket URL from ticketmaster affiliate links
        let ticketUrl = href;
        if (href.includes('ticketmaster.evyy.net')) {
          const uParam = href.match(/[?&]u=([^&]+)/);
          if (uParam) ticketUrl = decodeURIComponent(uParam[1]);
        }

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url: ticketUrl,
          imageUrl: null,
          description: '',
          venue: { ...venue, city: 'Toronto' },
          city: 'Toronto',
          category: 'Nightlife',
          source: 'EDM Canada'
        });
      });

      console.log(`  ✅ Found ${events.length} EDM Canada Toronto events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ EDM Canada Toronto error: ${error.message}`);
      return [];
    }
  }
};

module.exports = EdmCanadaTorontoEvents.scrape;
