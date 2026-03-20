/**
 * EDM Canada Montreal Events Scraper
 * URL: https://www.edmcanada.com/montreal
 * Aggregator for EDM/electronic events across Montreal venues
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const EdmCanadaMontrealEvents = {
  async scrape(city = 'Montreal') {
    console.log('🎧 Scraping EDM Canada Montreal...');

    try {
      const response = await axios.get('https://www.edmcanada.com/montreal', {
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
        'new city gas': { name: 'New City Gas', address: '950 Rue Ottawa, Montreal, QC H3C 1S4' },
        'newspeak': { name: 'Newspeak', address: '1151 Rue Sainte-Catherine E, Montreal, QC H2L 2G3' },
        'mtelus': { name: 'MTELUS', address: '59 Rue Sainte-Catherine E, Montreal, QC H2X 1K5' },
        'fairmount theatre': { name: 'Fairmount Theatre', address: '5240 Avenue du Parc, Montreal, QC H2V 4G7' },
        'fairmount': { name: 'Fairmount Theatre', address: '5240 Avenue du Parc, Montreal, QC H2V 4G7' },
        'parc jean-drapeau': { name: 'Parc Jean-Drapeau', address: '1 Circuit Gilles Villeneuve, Montreal, QC H3C 1A9' },
        'jean-drapeau': { name: 'Parc Jean-Drapeau', address: '1 Circuit Gilles Villeneuve, Montreal, QC H3C 1A9' },
        'bell centre': { name: 'Bell Centre', address: '1909 Avenue des Canadiens-de-Montréal, Montreal, QC H4B 5G0' },
        'place bell': { name: 'Place Bell', address: '2500 Avenue Alfred-Nobel, Laval, QC H7T 0A5' },
        'metropolis': { name: 'MTELUS', address: '59 Rue Sainte-Catherine E, Montreal, QC H2X 1K5' },
        'club soda': { name: 'Club Soda', address: '1225 Boulevard Saint-Laurent, Montreal, QC H2X 2S6' },
        'stereo': { name: 'Stereo Nightclub', address: '858 Rue Sainte-Catherine E, Montreal, QC H2L 2E7' },
        'piknic': { name: 'Piknic Électronik', address: '1 Circuit Gilles Villeneuve, Montreal, QC H3C 1A9' },
        'le belmont': { name: 'Le Belmont', address: '4483 Boulevard Saint-Laurent, Montreal, QC H2W 1Z8' },
        'theatre corona': { name: 'Théâtre Corona', address: '2490 Rue Notre-Dame O, Montreal, QC H3J 1N5' },
        'corona': { name: 'Théâtre Corona', address: '2490 Rue Notre-Dame O, Montreal, QC H3J 1N5' },
        'l\'olympia': { name: "L'Olympia", address: '1004 Rue Sainte-Catherine E, Montreal, QC H2L 2G2' },
        'olympia': { name: "L'Olympia", address: '1004 Rue Sainte-Catherine E, Montreal, QC H2L 2G2' },
      };

      const currentYear = new Date().getFullYear();

      const eventPattern = /(?:MON|TUE|WED|THU|FRI|SAT|SUN),\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2})(?:ST|ND|RD|TH)?\s*-\s*(.+?)@\s*(.+)/i;

      $('a[href]').each((i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href') || '';

        if (!href || href === '#') return;
        if (!href.includes('ticketmaster') && !href.includes('tixr.com') &&
            !href.includes('ticketweb') && !href.includes('edmcanada.com/') &&
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
          venue: { ...venue, city: 'Montreal' },
          city: 'Montreal',
          category: 'Nightlife',
          source: 'EDM Canada'
        });
      });

      console.log(`  ✅ Found ${events.length} EDM Canada Montreal events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ EDM Canada Montreal error: ${error.message}`);
      return [];
    }
  }
};

module.exports = EdmCanadaMontrealEvents.scrape;
