/**
 * EDM Canada Edmonton Events Scraper
 * URL: https://www.edmcanada.com/edmonton
 * Aggregator for EDM/electronic events across Edmonton venues
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const EdmCanadaEdmontonEvents = {
  async scrape(city = 'Edmonton') {
    console.log('🎧 Scraping EDM Canada Edmonton...');

    try {
      const response = await axios.get('https://www.edmcanada.com/edmonton', {
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
        'starlite room': { name: 'Starlite Room', address: '10030 102 St NW, Edmonton, AB T5J 0V6' },
        'starlite': { name: 'Starlite Room', address: '10030 102 St NW, Edmonton, AB T5J 0V6' },
        'pawn shop': { name: 'Pawn Shop Live', address: '10551 82 Ave NW, Edmonton, AB T6E 2A3' },
        'midway music hall': { name: 'Midway Music Hall', address: '11440 Jasper Ave NW, Edmonton, AB T5K 0M8' },
        'midway': { name: 'Midway Music Hall', address: '11440 Jasper Ave NW, Edmonton, AB T5K 0M8' },
        'fan park': { name: 'Fan Park at ICE District', address: '10220 104 Ave NW, Edmonton, AB T5J 0H6' },
        'ice district': { name: 'Fan Park at ICE District', address: '10220 104 Ave NW, Edmonton, AB T5J 0H6' },
        'rogers place': { name: 'Rogers Place', address: '10220 104 Ave NW, Edmonton, AB T5J 0H6' },
        'double dragon': { name: 'Double Dragon', address: '10365 83 Ave NW, Edmonton, AB T6E 2C6' },
        'union hall': { name: 'Union Hall', address: '6240 99 St NW, Edmonton, AB T6E 3N8' },
        'jubilee auditorium': { name: 'Northern Alberta Jubilee Auditorium', address: '11455 87 Ave NW, Edmonton, AB T6G 2T2' },
        'winspear centre': { name: 'Winspear Centre', address: '4 Sir Winston Churchill Sq, Edmonton, AB T5J 2C3' },
        'the needle': { name: 'The Needle Vinyl Exchange', address: '9531 76 Ave NW, Edmonton, AB T6C 0K1' },
      };

      const currentYear = new Date().getFullYear();

      const eventPattern = /(?:MON|TUE|WED|THU|FRI|SAT|SUN),\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2})(?:ST|ND|RD|TH)?\s*-\s*(.+?)@\s*(.+)/i;

      $('a[href]').each((i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href') || '';

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
          venue: { ...venue, city: 'Edmonton' },
          city: 'Edmonton',
          category: 'Nightlife',
          source: 'EDM Canada'
        });
      });

      console.log(`  ✅ Found ${events.length} EDM Canada Edmonton events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ EDM Canada Edmonton error: ${error.message}`);
      return [];
    }
  }
};

module.exports = EdmCanadaEdmontonEvents.scrape;
