/**
 * Burnaby Shadbolt Centre Scraper
 * Scrapes events from Burnaby Shadbolt Centre for the Arts
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const BurnabyShadboltCentreEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Burnaby Shadbolt Centre...');

    try {
      const response = await axios.get('https://www.burnaby.ca/parks-recreation-culture/culture/shadbolt-centre-arts', {
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
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'a[href*="/show"]',
        'a[href*="/performance"]',
        '.event-item a',
        '.show-item a',
        'article a',
        '.post a',
        'h2 a',
        'h3 a',
        'a:contains("Show")',
        'a:contains("Performance")',
        'a:contains("Theatre")',
        'a:contains("Play")',
        'a:contains("Concert")',
        'a:contains("Musical")',
        'a:contains("Dance")',
        'a:contains("Arts")'
      ];

      for (const selector of eventSelectors) {
        const links = $(selector);
        if (links.length > 0) {
          console.log(`Found ${links.length} events with selector: ${selector}`);
        }

        links.each((index, element) => {
          const $element = $(element);
          let title = $element.text().trim();
          let url = $element.attr('href');

          if (!title || !url || seenUrls.has(url)) return;

          if (url.startsWith('/')) {
            url = 'https://www.burnaby.ca' + url;
          }

          const skipPatterns = [
            /facebook\.com/i, /twitter\.com/i, /instagram\.com/i,
            /\/about/i, /\/contact/i, /\/home/i
          ];

          if (skipPatterns.some(pattern => pattern.test(url))) return;

          title = title.replace(/\s+/g, ' ').trim();
          if (title.length < 3) return;

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
            venue: { name: 'Burnaby Shadbolt Centre', address: '6450 Deer Lake Avenue, Burnaby, BC V5G 2J3', city: 'Vancouver' },
            city: 'Burnaby',
            date: dateText || null,
            source: 'Burnaby Shadbolt Centre'
          });
        });
      }

      console.log(`Found ${events.length} total events from Burnaby Shadbolt Centre`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Burnaby Shadbolt Centre events:', error.message);
      return [];
    }
  }
};


module.exports = BurnabyShadboltCentreEvents.scrape;
