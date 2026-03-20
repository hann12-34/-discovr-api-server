/**
 * EDM Canada Calgary Events Scraper
 * URL: https://www.edmcanada.com/calgary
 * Aggregator for EDM/electronic events across Calgary venues
 * Extracts events directly from links to get real ticket URLs
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const EdmCanadaCalgaryEvents = {
  async scrape(city = 'Calgary') {
    console.log('🎧 Scraping EDM Canada Calgary...');

    try {
      const response = await axios.get('https://www.edmcanada.com/calgary', {
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
        'commonwealth bar': { name: 'Commonwealth Bar & Stage', address: '731 10 Ave SW, Calgary, AB T2R 0B3' },
        'commonwealth': { name: 'Commonwealth Bar & Stage', address: '731 10 Ave SW, Calgary, AB T2R 0B3' },
        'grey eagle': { name: 'Grey Eagle Event Centre', address: '3777 Grey Eagle Dr SW, Calgary, AB T3E 3X8' },
        'palace theatre': { name: 'The Palace Theatre', address: '219 8 Ave SW, Calgary, AB T2P 1B5' },
        'the palace': { name: 'The Palace Theatre', address: '219 8 Ave SW, Calgary, AB T2P 1B5' },
        'hifi club': { name: 'HiFi Club', address: '219 10 Ave SW, Calgary, AB T2R 0A4' },
        'national on 10th': { name: 'National on 10th', address: '341 10 Ave SW, Calgary, AB T2R 0A5' },
        'dickens pub': { name: 'Dickens Pub', address: '1000 9 Ave SW, Calgary, AB T2P 5L6' },
        'broken city': { name: 'Broken City', address: '613 11 Ave SW, Calgary, AB T2R 0E1' },
        'saddledome': { name: 'Scotiabank Saddledome', address: '555 Saddledome Rise SE, Calgary, AB T2G 2W1' },
        'jubilee auditorium': { name: 'Southern Alberta Jubilee Auditorium', address: '1415 14 Ave NW, Calgary, AB T2N 1M4' },
        'jubilee': { name: 'Southern Alberta Jubilee Auditorium', address: '1415 14 Ave NW, Calgary, AB T2N 1M4' },
        'common/undrgrd': { name: 'Common/UNDRGRD', address: '731 10 Ave SW, Calgary, AB T2R 0B3' },
        'macewan hall': { name: 'MacEwan Hall', address: '2500 University Dr NW, Calgary, AB T2N 1N4' },
        'max bell centre': { name: 'Max Bell Centre', address: '1001 Barlow Trail SE, Calgary, AB T2E 7L4' },
        'badland': { name: "Badlands Tent", address: '1410 Olympic Way SE, Calgary, AB T2G 2W1' },
        'the grand': { name: 'The Grand YYC', address: '608 1 St SW, Calgary, AB T2P 1M6' },
        'ironwood': { name: 'Ironwood Stage & Grill', address: '1229 9 Ave SE, Calgary, AB T2G 0S9' },
        'calgary tower': { name: 'Calgary Tower', address: '101 9 Ave SW, Calgary, AB T2P 1J9' },
        'rooftop yyc': { name: 'The Rooftop YYC', address: '317 7 Ave SW, Calgary, AB T2P 2Y9' },
        'the arrowhead': { name: 'The Arrowhead', address: '1210 1 St SW, Calgary, AB T2R 0V3' },
        'su ballroom': { name: 'SU Ballroom', address: '2500 University Dr NW, Calgary, AB T2N 1N4' },
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
          venue: { ...venue, city: 'Calgary' },
          city: 'Calgary',
          category: 'Nightlife',
          source: 'EDM Canada'
        });
      });

      console.log(`  ✅ Found ${events.length} EDM Canada Calgary events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ EDM Canada Calgary error: ${error.message}`);
      return [];
    }
  }
};

module.exports = EdmCanadaCalgaryEvents.scrape;
