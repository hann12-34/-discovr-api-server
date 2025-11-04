/**
 * Vancouver's Best Places Events Scraper
 * Scrapes events from Vancouver's Best Places event calendar
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VancouversBestPlacesEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver\'s Best Places...');

    try {
      const response = await axios.get('https://vancouversbestplaces.com/events-calendar/', {
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

      // Use article links and h3 links to avoid duplicates
      const eventSelectors = ['article a', 'h3 a'];

      // Collect unique URLs first
      const allLinks = new Set();
      eventSelectors.forEach(selector => {
        $(selector).each((i, el) => {
          const href = $(el).attr('href');
          // Only add internal links
          if (href && (href.startsWith('/') || href.includes('vancouversbestplaces.com'))) {
            allLinks.add(href);
          }
        });
      });

      console.log(`Found ${allLinks.size} unique events from Vancouver's Best Places`);

      allLinks.forEach(href => {
        let url = href;
        
        // Make URL absolute FIRST
        if (url.startsWith('/')) {
          url = 'https://vancouversbestplaces.com' + url;
        }

        // Skip if already seen
        if (seenUrls.has(url)) return;
        
        const $element = $(`a[href="${href}"]`).first();
        let title = $element.text().trim();
        
        if (!title || !url) return;

          // Filter out navigation, social media, and promotional links
          const skipPatterns = [
            /facebook\.com/i, /twitter\.com/i, /instagram\.com/i, /youtube\.com/i,
            /\/about/i, /\/contact/i, /\/home/i, /\/search/i,
            /\/login/i, /\/register/i, /\/account/i, /\/cart/i,
            /mailto:/i, /tel:/i, /javascript:/i, /#/,
            /\/privacy/i, /\/terms/i, /\/policy/i, /\/subscribe/i,
            /\/newsletter/i, /\/advertise/i, /\/category/i
          ];

          if (skipPatterns.some(pattern => pattern.test(url))) {
            console.log(`✗ Filtered out: "${title}" (URL: ${url})`);
            return;
          }

          // Clean up title
          title = title.replace(/\s+/g, ' ').trim();
          
          // Skip very short or generic titles
          if (title.length < 3 || /^(home|about|contact|search|login|more|info|read more|continue reading)$/i.test(title)) {
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
            venue: { name: "Vancouver's Best Places", address: 'Various Locations, Vancouver, BC', city: 'Vancouver' },
            city: 'Vancouver',
            date: dateText || null,
            source: "Vancouver's Best Places"
          });
        });

      console.log(`Found ${events.length} total events from Vancouver's Best Places`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Vancouver\'s Best Places events:', error.message);
      return [];
    }
  }
};


module.exports = VancouversBestPlacesEvents.scrape;
