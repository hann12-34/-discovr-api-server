/**
 * Celebrities Nightclub Events Scraper
 * Scrapes events from Celebrities Nightclub Vancouver
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const CelebritiesNightclubEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Celebrities Nightclub...');

    try {
      const response = await axios.get('https://www.celebritiesnightclub.com/events', {
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

      // Selectors for Celebrities Nightclub events page
      const eventSelectors = [
        'a[href*="/events/"]',
        'a:contains("FFFForeal fridays")',
        'a:contains("LOCAL LOVE")',
        'a:contains("WUKI")',
        'a:contains("BED BY 10PM")', 
        'a:contains("WESTEND")',
        'a:contains("JAUZ")',
        'a:contains("MATHAME")',
        'a:contains("ZERB")',
        'a:contains("J WORRA")',
        'a:contains("BUNT")',
        'a:contains("FORESTER")',
        'a:contains("BAYNK")',
        'a:contains("DEEP DISH")',
        'a:contains("Playhouse")',
        'a:contains("STACKED")',
        'a:contains("Stereotype")',
        'h3 a',
        'h2 a',
        '.event-card a',
        '.event-item a'
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

          // Skip if we've already seen this URL
          if (seenUrls.has(url)) return;

          // Convert relative URLs to absolute
          if (url.startsWith('/')) {
            url = 'https://www.celebritiesnightclub.com' + url;
          }

          // Filter out navigation, social media, and promotional links
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

          // Clean up title
          title = title.replace(/\s+/g, ' ').trim();
          
          // Skip very short or generic titles
          if (title.length < 2 || /^(home|about|contact|search|login|more|info|buy|tickets?|ics|view event|→|view event →)$/i.test(title)) {
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
            venue: { name: 'Celebrities Nightclub', address: '1022 Davie Street, Vancouver, BC V6E 1M3', city: 'Vancouver' },
            city: city,
            date: dateText || null,
            source: 'Celebrities Nightclub',
            category: 'Nightlife'
          });
        });
      }

      console.log(`Found ${events.length} total events from Celebrities Nightclub`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Celebrities Nightclub events:', error.message);
      return [];
    }
  }
};


module.exports = CelebritiesNightclubEvents.scrape;
