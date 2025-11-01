/**
 * Vancouver Writers Fest Events Scraper
 * Scrapes events from Vancouver Writers Festival
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VancouverWritersFestEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver Writers Fest...');

    try {
      const response = await axios.get('https://writersfest.bc.ca/', {
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
        'a[href*="/reading/"]',
        'a[href*="/readings/"]',
        'a[href*="/author/"]',
        'a[href*="/authors/"]',
        '.event-item a',
        '.reading-item a',
        '.author-item a',
        '.listing a',
        '.event-listing a',
        '.reading-listing a',
        '.event-card a',
        '.reading-card a',
        'h3 a',
        'h2 a',
        'h1 a',
        '.event-title a',
        '.reading-title a',
        '.author-name a',
        'article a',
        '.event a',
        '.reading a',
        '.author a',
        'a[title]',
        '[data-testid*="event"] a',
        'a:contains("Reading")',
        'a:contains("Author")',
        'a:contains("Book")',
        'a:contains("Festival")',
        'a:contains("Event")',
        'a:contains("Literature")',
        'a:contains("Writing")',
        'a:contains("Workshop")'
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
            url = 'https://writersfest.bc.ca' + url;
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


          if (dateText) dateText = dateText.replace(/\s+/g, ' ').trim();


          


          events.push({
            id: uuidv4(),
            title: title,
            url: url,
            venue: { name: 'Vancouver Writers Fest', address: 'Various Locations, Vancouver, BC', city: 'Vancouver' },
            city: city,
            date: dateText || null,
            source: 'Vancouver Writers Fest'
          });
        });
      }

      console.log(`Found ${events.length} total events from Vancouver Writers Fest`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Vancouver Writers Fest events:', error.message);
      return [];
    }
  }
};


module.exports = VancouverWritersFestEvents.scrape;
