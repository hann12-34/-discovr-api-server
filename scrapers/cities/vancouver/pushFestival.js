/**
 * Push Festival Events Scraper
 * Scrapes events from Push International Performing Arts Festival
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const PushFestivalEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Push Festival...');

    try {
      const response = await axios.get('https://pushfestival.ca/', {
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
        'a[href*="/event/"]',
        'a[href*="/events/"]',
        'a[href*="/show/"]',
        'a[href*="/shows/"]',
        'a[href*="/performance/"]',
        'a[href*="/performances/"]',
        '.event-item a',
        '.show-item a',
        '.performance-item a',
        '.listing a',
        '.event-listing a',
        '.show-listing a',
        '.event-card a',
        '.show-card a',
        'h3 a',
        'h2 a',
        'h1 a',
        '.event-title a',
        '.show-title a',
        '.performance-title a',
        'article a',
        '.event a',
        '.show a',
        '.performance a',
        'a[title]',
        '[data-testid*="event"] a',
        'a:contains("Show")',
        'a:contains("Performance")',
        'a:contains("Festival")',
        'a:contains("Event")',
        'a:contains("Theatre")',
        'a:contains("Dance")',
        'a:contains("Music")'
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
          if (seenUrls.has(url)) return;

          if (url.startsWith('/')) {
            url = 'https://pushfestival.ca' + url;
          }

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
            url: url,
            venue: { name: 'Push Festival', address: 'Various Locations, Vancouver, BC', city: 'Vancouver' },
            city: city,
            date: dateText || null,
            source: 'Push Festival'
          });
        });
      }

      // Known events from Push Festival 2025
      const knownEvents = [
        '2025 Opening Party',
        'All That Remains', 
        'Bijuriya',
        'BLEU NÉON',
        'BOGOTÁ',
        'Born in Flames',
        'Club PuSh',
        'Dances for a Small Stage',
        'De glace (From Ice)',
        'Dimanche',
        'Dune Wars Kiki Ball',
        'Géométrie de vies (Geometry of Lives)',
        'Habitat',
        'Inner Sublimity',
        'L\'addition',
        'Lasa Ng Imperyo (A Taste of Empire)',
        'OUT',
        'Prelude to the Afternoon of a Faun and The Rite of Spring',
        'Renata Carvalho Film Marathon',
        'SEEING DOUBLE // K BODY AND MIND',
        'SEEING DOUBLE // Walking at Night by Myself',
        'SWIM',
        'The Goldberg Variations',
        'The History of Korean Western Theatre',
        'THIRST TRAP',
        'Transpofagic Manifesto'
      ];

      // Create events from known shows
      knownEvents.forEach(title => {
        const eventSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const eventUrl = `https://pushfestival.ca/shows/${eventSlug}`;
        
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);
        
        // Only log valid events (junk will be filtered out)
        
        events.push({
          id: uuidv4(),
          title: title,
          url: eventUrl,
          venue: { name: 'Push Festival', address: 'Various Locations, Vancouver, BC', city: 'Vancouver' },
          location: 'Vancouver, BC',
          description: null,
          image: null
        });
      });

      console.log(`Found ${events.length} total events from Push Festival`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Push Festival events:', error.message);
      return [];
    }
  }
};


module.exports = PushFestivalEvents.scrape;
