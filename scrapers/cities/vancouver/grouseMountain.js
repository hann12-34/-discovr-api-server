/**
 * Grouse Mountain Scraper
 * Scrapes events from Grouse Mountain
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const GrouseMountainEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Grouse Mountain...');

    try {
      const response = await axios.get('https://www.grousemountain.com/', {
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
        'a[href*="/experience"]',
        'a[href*="/show"]',
        '.event-item a',
        '.experience-item a',
        'article a',
        '.post a',
        'h2 a',
        'h3 a',
        'a:contains("Event")',
        'a:contains("Experience")',
        'a:contains("Show")',
        'a:contains("Concert")',
        'a:contains("Festival")',
        'a:contains("Theatre")',
        'a:contains("Dinner")',
        'a:contains("Skyride")'
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
            url = 'https://www.grousemountain.com' + url;
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


          if (dateText) dateText = dateText.replace(/\s+/g, ' ').trim();


          


          events.push({
            id: uuidv4(),
            title: title,
            url: url,
            venue: { name: 'Grouse Mountain', address: '6400 Nancy Greene Way, North Vancouver, BC V7R 4K9', city: 'Vancouver' },
            city: 'North Vancouver',
            date: dateText || null,
            source: 'Grouse Mountain'
          });
        });
      }

      console.log(`Found ${events.length} total events from Grouse Mountain`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Grouse Mountain events:', error.message);
      return [];
    }
  }
};


module.exports = GrouseMountainEvents.scrape;
