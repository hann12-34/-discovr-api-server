/**
 * EDM Canada Ottawa Events Scraper
 * URL: https://www.edmcanada.com/ottawa-events
 * Aggregator for EDM/electronic events across Ottawa venues
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const EdmCanadaOttawaEvents = {
  async scrape(city = 'Ottawa') {
    console.log('🎧 Scraping EDM Canada Ottawa...');

    try {
      const response = await axios.get('https://www.edmcanada.com/ottawa-events', {
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

      const venueMap = {
        'gridwrks': { name: 'Gridwrks', address: '246 Queen St, Ottawa, ON K1P 5E4' },
        'gridworks': { name: 'Gridwrks', address: '246 Queen St, Ottawa, ON K1P 5E4' },
        'alea': { name: 'Alea', address: '21 George St, Ottawa, ON K1N 8W5' },
        'ra centre': { name: 'RA Centre Grounds', address: '2451 Riverside Dr, Ottawa, ON K1H 7X7' },
        'td place': { name: 'TD Place', address: '1015 Bank St, Ottawa, ON K1S 3W7' },
        'canadian tire centre': { name: 'Canadian Tire Centre', address: '1000 Palladium Dr, Ottawa, ON K2V 1A5' },
        'brass monkey': { name: 'Brass Monkey', address: '250 Greenbank Rd, Ottawa, ON K2H 8X4' },
        'club saw': { name: 'Club SAW', address: '67 Nicholas St, Ottawa, ON K1N 7B9' },
        'ritual nightclub': { name: 'Ritual Nightclub', address: '137 Besserer St, Ottawa, ON K1N 6A7' },
        'overflow brewing': { name: 'Overflow Brewing', address: '2477 Kaladar Ave, Ottawa, ON K1V 8B9' },
        'barrymore': { name: "Barrymore's Music Hall", address: '323 Bank St, Ottawa, ON K2P 1X9' },
        'bronson centre': { name: 'Bronson Centre', address: '211 Bronson Ave, Ottawa, ON K1R 6H5' },
      };

      const currentYear = new Date().getFullYear();

      const eventPattern = /(?:MON|TUE|WED|THU|FRI|SAT|SUN),\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2})(?:ST|ND|RD|TH)?\s*-\s*(.+?)@\s*(.+)/i;

      $('a[href]').each((i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href') || '';

        if (!href || href === '#') return;
        if (!href.includes('ticketmaster') && !href.includes('tixr.com') &&
            !href.includes('ticketweb') && !href.includes('edmcanada.com/') &&
            !href.includes('ticketscandy.com') && !href.includes('thepointofsale.com') &&
            !href.includes('universe.com')) return;

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

        const venueKey = Object.keys(venueMap).find(k => venueName.toLowerCase().includes(k));
        if (!venueKey) return;
        const venue = venueMap[venueKey];

        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

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
          venue: { ...venue, city: 'Ottawa' },
          city: 'Ottawa',
          category: 'Nightlife',
          source: 'EDM Canada'
        });
      });

      console.log(`  ✅ Found ${events.length} EDM Canada Ottawa events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ EDM Canada Ottawa error: ${error.message}`);
      return [];
    }
  }
};

module.exports = EdmCanadaOttawaEvents.scrape;
