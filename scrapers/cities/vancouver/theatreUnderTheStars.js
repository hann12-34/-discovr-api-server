/**
 * Theatre Under The Stars Events Scraper
 * Scrapes events from Theatre Under The Stars (TUTS) Vancouver
 * Stanley Park's Malkin Bowl outdoor theatre
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const TheatreUnderTheStarsEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Theatre Under The Stars...');

    try {
      // TUTS 2025 season has ended - they only run summer seasons
      console.log('Theatre Under The Stars 2025 season has ended. Next season: Summer 2026');
      return [];

      const response = await axios.get('https://www.tuts.ca/', {
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

      // Look for show announcements and ticket links
      const eventSelectors = [
        'a[href*="/show"]',
        'a[href*="/ticket"]', 
        'a[href*="/season"]',
        'a:contains("Charlie")',
        'a:contains("Legally Blonde")',
        'a:contains("2026")',
        'h3 a',
        'h2 a',
        '.show a',
        '.event a'
      ];

      for (const selector of eventSelectors) {
        const eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);

          eventElements.each((i, element) => {
            const $event = $(element);
            
            let title = $event.text().trim();
            let url = $event.attr('href');

            if (!title || !url) return;
            if (seenUrls.has(url)) return;

            if (url && !url.startsWith('http')) {
              url = 'https://www.tuts.ca' + url;
            }

            // Filter out navigation and non-event links
            const skipTerms = ['donate', 'volunteer', 'sponsor', 'instagram', 'facebook', 'about', 'contact'];
            if (skipTerms.some(term => title.toLowerCase().includes(term) || url.toLowerCase().includes(term))) {
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
              date: null,  // TODO: Add date extraction logic
              url: url,
              venue: { name: 'Theatre Under The Stars', address: 'Vancouver', city: 'Vancouver' },
              location: 'Stanley Park, Vancouver, BC',
              description: null,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Theatre Under The Stars`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Theatre Under The Stars events:', error.message);
      return [];
    }
  }
};


module.exports = TheatreUnderTheStarsEvents.scrape;
