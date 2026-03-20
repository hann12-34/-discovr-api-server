/**
 * EDM Canada Vancouver Events Scraper
 * URL: https://www.edmcanada.com/vancouver
 * Aggregator for EDM/electronic events across Vancouver venues
 * Extracts events directly from links to get real ticket URLs
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const EdmCanadaVancouverEvents = {
  async scrape(city = 'Vancouver') {
    console.log('🎧 Scraping EDM Canada Vancouver...');

    try {
      const response = await axios.get('https://www.edmcanada.com/vancouver', {
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

      // Only venues with verified real street addresses
      const venueMap = {
        'harbour': { name: 'Harbour Event & Convention Centre', address: '760 Pacific Blvd, Vancouver, BC' },
        'commodore ballroom': { name: 'Commodore Ballroom', address: '868 Granville St, Vancouver, BC' },
        'commodore': { name: 'Commodore Ballroom', address: '868 Granville St, Vancouver, BC' },
        'celebrities': { name: 'Celebrities Nightclub', address: '1022 Davie St, Vancouver, BC' },
        'village studios': { name: 'Village Studios', address: '252 E 1st Ave, Vancouver, BC' },
        'fortune sound club': { name: 'Fortune Sound Club', address: '147 E Pender St, Vancouver, BC' },
        'fortune': { name: 'Fortune Sound Club', address: '147 E Pender St, Vancouver, BC' },
        'malkin bowl': { name: 'Malkin Bowl', address: '610 Pipeline Rd, Stanley Park, Vancouver, BC' },
        'the pearl': { name: 'The Pearl', address: '1193 Hamilton St, Vancouver, BC' },
        'hollywood theatre': { name: 'Hollywood Theatre', address: '3123 W Broadway, Vancouver, BC' },
        'vogue theatre': { name: 'Vogue Theatre', address: '918 Granville St, Vancouver, BC' },
        'orpheum': { name: 'Orpheum Theatre', address: '601 Smithe St, Vancouver, BC' },
        'the rio theatre': { name: 'Rio Theatre', address: '1660 E Broadway, Vancouver, BC' },
        'rio theatre': { name: 'Rio Theatre', address: '1660 E Broadway, Vancouver, BC' },
        'pne forum': { name: 'PNE Forum', address: '2901 E Hastings St, Vancouver, BC' },
        'bc place': { name: 'BC Place', address: '777 Pacific Blvd, Vancouver, BC' },
        'rogers arena': { name: 'Rogers Arena', address: '800 Griffiths Way, Vancouver, BC' },
        'holland park': { name: 'Holland Park', address: '13428 Old Yale Rd, Surrey, BC' },
        'harbour theatre': { name: 'Harbour Theatre', address: '760 Pacific Blvd, Vancouver, BC' },
        'halo': { name: 'HALO', address: '760 Pacific Blvd, Vancouver, BC' },
      };

      const currentYear = new Date().getFullYear();

      // Extract events directly from <a> links that have ticket URLs
      // EDM Canada format in link text: "DAY, MONTH DAYTH - ARTIST @ VENUE"
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
          venue: { ...venue, city: 'Vancouver' },
          city: 'Vancouver',
          category: 'Nightlife',
          source: 'EDM Canada'
        });
      });

      console.log(`  ✅ Found ${events.length} EDM Canada Vancouver events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ EDM Canada Vancouver error: ${error.message}`);
      return [];
    }
  }
};

module.exports = EdmCanadaVancouverEvents.scrape;
