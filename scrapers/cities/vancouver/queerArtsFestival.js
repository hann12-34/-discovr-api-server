/**
 * Queer Arts Festival Scraper
 * Scrapes events from Queer Arts Festival Vancouver
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const QueerArtsFestivalEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Queer Arts Festival...');

    try {
      const response = await axios.get('https://queerartsfestival.com/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      // Real scraping only; no fabricated fallbacks
      const selectors = [
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'article a',
        '.post a',
        'h2 a',
        'h3 a'
      ];

      const isSkip = (title, url) => {
        const skip = [
          /facebook\.com/i, /instagram\.com/i, /twitter\.com/i,
          /\/about/i, /\/contact/i, /\/home/i, /\/donate/i,
          /\/press/i, /\/privacy/i, /\/terms/i, /#/
        ];
        return !title || !url || skip.some(rx => rx.test(url));
      };

      for (const sel of selectors) {
        const nodes = $(sel);
        nodes.each((i, el) => {
          let title = $(el).text().trim().replace(/\s+/g, ' ');
          let url = $(el).attr('href') || '';
          if (url.startsWith('/')) url = 'https://queerartsfestival.com' + url;
          if (isSkip(title, url)) return;
          if (seen.has(url)) return;
          seen.add(url);

          // Attempt to find a nearby date
          let date = null;
          const container = $(el).closest('article, .event, .entry, section, div');
          const dateText = container.find('time, .date, [class*="date"]').first().text().trim();
          if (dateText) date = dateText.replace(/\s+/g, ' ');

          events.push({
            id: uuidv4(),
            title,
            date: date || null,
            time: null,
            url,
            venue: { name: 'Queer Arts Festival', address: 'Various Locations, Vancouver, BC', city: 'Vancouver' },
            location: 'Vancouver, BC',
            category: 'Festival',
            city: 'Vancouver',
            image: null,
            source: 'Queer Arts Festival'
          });
        });
      }

      console.log(`Found ${events.length} total events from Queer Arts Festival`);
      const filtered = filterEvents(events);

      // Fetch descriptions from event detail pages
      for (const event of events) {
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

      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Queer Arts Festival events:', error.message);
      return [];
    }
  }
};


module.exports = QueerArtsFestivalEvents.scrape;
