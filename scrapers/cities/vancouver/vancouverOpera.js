/**
 * Vancouver Opera Events Scraper
 * Scrapes events from Vancouver Opera
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VancouverOperaEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver Opera...');

    try {
      const response = await axios.get('https://www.vancouveropera.ca/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      const eventSelectors = [
        'a[href*="/whats-on/"]',
        'a[href*="rigoletto"]',
        'a[href*="cosi-fan-tutte"]',
        'a[href*="la-boheme"]',
        'a[href*="voices"]',
        'h5 a',
        'h4 a',
        'h3 a',
        'h2 a',
        '.card a',
        '.event a',
        '.show a',
        '.production a',
        'a:contains("Learn More")',
        'a:contains("Rigoletto")',
        'a:contains("Così fan tutte")',
        'a:contains("La Bohème")',
        'a:contains("Opera Adventures")',
        'a:contains("VOICES")',
        'a:contains("Season")',
        'a:contains("Tickets")'
      ];

      let foundCount = 0;
      for (const selector of eventSelectors) {
        const links = $(selector);
        if (links.length > 0) {
          console.log(`Found ${links.length} events with selector: ${selector}`);
          foundCount += links.length;
        }

        links.each((index, element) => {
          const $element = $(element);
          let title = $element.text().trim();
          let url = $element.attr('href');

          if (!title || !url) return;

          // Make URL absolute FIRST before checking duplicates
          if (url.startsWith('/')) {
            url = 'https://www.vancouveropera.ca' + url;
          }
          
          // NOW check for duplicates with absolute URL
          if (seenUrls.has(url)) return;

          const skipPatterns = [
            /facebook\.com/i, /twitter\.com/i, /instagram\.com/i, /youtube\.com/i,
            /\/about/i, /\/contact/i, /\/home/i, /\/search/i,
            /\/login/i, /\/register/i, /\/account/i, /\/cart/i,
            /mailto:/i, /tel:/i, /javascript:/i, /#/,
            /\/privacy/i, /\/terms/i, /\/policy/i
          ];

          if (skipPatterns.some(pattern => pattern.test(url))) {
            console.log(`✗ Filtered out: "${title}" (URL: ${url})`);
            return;
          }

          title = title.replace(/\s+/g, ' ').trim();
          
          if (title.length < 2 || /^(home|about|contact|search|login|more|info|buy|tickets?)$/i.test(title)) {
            console.log(`✗ Filtered out generic title: "${title}"`);
            return;
          }

          seenUrls.add(url);

          // Only log valid events (junk will be filtered out)
          // Extract date from event element


          let dateText = null;


          const dateSelectors = ['time[datetime]', '.date', '.event-date', '[class*="date"]', 'time', '.datetime', '.when'];


          for (const selector of dateSelectors) {


            const dateEl = $element.find(selector).first();


            if (dateEl.length > 0) {


              dateText = dateEl.attr('datetime') || dateEl.text().trim();


              if (dateText && dateText.length > 0) break;


            }


          }


          if (!dateText) {


            const $parent = $element.closest('.event, .event-item, article, [class*="event"]');


            if ($parent.length > 0) {


              for (const selector of dateSelectors) {


                const dateEl = $parent.find(selector).first();


                if (dateEl.length > 0) {


                  dateText = dateEl.attr('datetime') || dateEl.text().trim();


                  if (dateText && dateText.length > 0) break;


                }


              }


            }


          }


          // Extract date from title if not found (Vancouver Opera embeds dates in titles)
          if (!dateText && title) {
            const dateMatch = title.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*(?:–|-)\s*\d{1,2},?\s*\d{4}/i);
            if (dateMatch) {
              dateText = dateMatch[0];
              // Clean title by removing date and "Learn More"
              title = title.replace(dateMatch[0], '').replace(/Learn More/gi, '').trim();
            }
          }
          
          if (dateText) {
            dateText = dateText
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
              .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
              .trim();
            
            if (!/\d{4}/.test(dateText)) {
              const currentYear = new Date().getFullYear();
              const currentMonth = new Date().getMonth();
              const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
              const dateLower = dateText.toLowerCase();
              const monthIndex = months.findIndex(m => dateLower.includes(m));
              if (monthIndex !== -1) {
                const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
                dateText = `${dateText}, ${year}`;
              } else {
                dateText = `${dateText}, ${currentYear}`;
              }
            }
          }

          events.push({
            id: uuidv4(),
            title: title,
            description: '',
            url: url,
            venue: { name: 'Vancouver Opera', address: '500-845 Cambie Street, Vancouver, BC V6B 4Z9', city: 'Vancouver' },
            city: city,
            date: dateText || null,
            source: 'Vancouver Opera'
          });
        });
      }

      console.log(`Found ${events.length} total events from Vancouver Opera`);
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
      console.error('Error scraping Vancouver Opera events:', error.message);
      return [];
    }
  }
};


module.exports = VancouverOperaEvents.scrape;
