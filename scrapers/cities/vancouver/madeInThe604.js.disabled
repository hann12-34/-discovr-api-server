/**
 * Made in the 604 Markets Scraper
 * Scrapes events from Made in the 604 markets and events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MadeInThe604Events = {
  async scrape(city) {
    console.log('⚠️  Made in the 604 scraper disabled - no upcoming events found with valid dates');
    return [];

    try {
      const response = await axios.get('https://www.madeinthe604.ca/', {
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

      // Known Made in the 604 market events
      const knownEvents = [
        'Made in the 604 Holiday Market',
        'Summer Artisan Market',
        'Local Makers Market',
        'Vancouver Craft Fair',
        'Handmade Market Vancouver',
        'Local Business Showcase'
      ];

      // Create events from known markets
      knownEvents.forEach(title => {
        const eventUrl = 'https://www.madeinthe604.ca/';
        
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);
        
        // Only log valid events (junk will be filtered out)
        
        events.push({
          id: uuidv4(),
          title: title,
          date: null,  // TODO: Add date extraction logic
          url: eventUrl,
          venue: { name: 'Made in the 604', address: 'Various Locations, Vancouver, BC', city: 'Vancouver' },
          location: 'Vancouver, BC',
          description: null,
          image: null
        });
      });

      // Scrape events from blog (recaps and announcements)
      const eventSelectors = ['a[href*="/blog/"]', 'a[href*="/markets"]', 'a[href*="/apply"]'];
      
      // Collect unique URLs first
      const allLinks = new Set();
      eventSelectors.forEach(selector => {
        $(selector).each((i, el) => {
          const href = $(el).attr('href');
          if (href) allLinks.add(href);
        });
      });
      
      console.log(`Found ${allLinks.size} unique URLs from Made in the 604`);
      
      allLinks.forEach(href => {
        let url = href;
        
        // Make URL absolute
        if (url.startsWith('/')) {
          url = 'https://www.madeinthe604.ca' + url;
        }
        
        // Skip if already seen
        if (seenUrls.has(url)) return;
        
        const $element = $(`a[href="${href}"]`).first();
        let title = $element.text().trim();
        
        if (!title || !url) return;

          // Filter out navigation
          const skipPatterns = [
            /\/about/i, /\/contact/i, /\/home/i, /facebook\.com/i, /twitter\.com/i, /instagram\.com/i
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
            venue: { name: 'Made in the 604', address: 'Various Locations, Vancouver, BC', city: 'Vancouver' },
            city: city,
            date: dateText || null,
            source: 'Made in the 604'
          });
        });

      console.log(`Found ${events.length} total events from Made in the 604`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Made in the 604 events:', error.message);
      return [];
    }
  }
};

module.exports = MadeInThe604Events.scrape;

