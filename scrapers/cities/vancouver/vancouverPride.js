/**
 * Vancouver Pride Events Scraper
 * Scrapes events from Vancouver Pride Festival
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VancouverPrideEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver Pride...');

    try {
      const response = await axios.get('https://www.vancouverpride.ca/', {
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

      // Use only the most specific selectors to avoid duplicates
      const eventSelectors = [
        'a[href*="/prideevents/"]',
        'a[href*="/parade-applications"]',
        'a[href*="/program-pride"]'
      ];

      // Collect all links with ONE pass
      const allLinks = new Set();
      eventSelectors.forEach(selector => {
        $(selector).each((i, el) => {
          const href = $(el).attr('href');
          if (href) allLinks.add(href);
        });
      });

      console.log(`Found ${allLinks.size} unique event URLs from Vancouver Pride`);

      allLinks.forEach(href => {
        let url = href;
        
        // Make URL absolute
        if (url.startsWith('/')) {
          url = 'https://www.vancouverpride.ca' + url;
        }
        
        // Skip if already seen
        if (seenUrls.has(url)) return;
        
        const $element = $(`a[href="${href}"]`).first();
        let title = $element.text().trim();

        if (!title || !url) return;

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
            venue: { name: 'Vancouver Pride', address: 'Vancouver', city: 'Vancouver' },
            city: city,
            date: dateText || null,
            source: 'Vancouver Pride'
          });
        });

      console.log(`Found ${events.length} total events from Vancouver Pride`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Vancouver Pride events:', error.message);
      return [];
    }
  }
};


module.exports = VancouverPrideEvents.scrape;
