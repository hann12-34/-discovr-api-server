const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

/**
 * Universal scraper template that works for many venue websites
 * Usage: createScraper('Venue Name', 'https://venue.com/events', 'Address, City, State ZIP')
 */
function createUniversalScraper(venueName, url, address) {
  return async function scrape(city = 'New York') {
    let events = [];
    
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Try multiple event container selectors
      const containers = new Set();
      const selectors = [
        '.event', '[class*="event"]', '[class*="Event"]',
        'article', '.show', '[class*="show"]',
        '.card', '[class*="card"]',
        '.listing', 'li[class*="item"]',
        '[data-event]', '.performance', '.concert'
      ];
      
      selectors.forEach(sel => {
        $(sel).each((i, el) => {
          if (i < 50) containers.add(el);
        });
      });
      
      Array.from(containers).forEach((el) => {
        const $e = $(el);
        
        // Extract title
        const title = (
          $e.find('h1, h2, h3, h4').first().text().trim() ||
          $e.find('.title, [class*="title"]').first().text().trim() ||
          $e.find('.name, [class*="name"]').first().text().trim() ||
          $e.find('a').first().text().trim()
        ).substring(0, 250);
        
        if (!title || title.length < 5) return;
        if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|View All|Load More|Filter|Sort)/i)) return;
        
        // Extract date
        let dateText = '';
        const dateEl = $e.find('[datetime]').first();
        if (dateEl.length) {
          dateText = dateEl.attr('datetime') || dateEl.text().trim();
        }
        
        if (!dateText) {
          dateText = $e.find('time, .date, [class*="date"], .when, .schedule').first().text().trim();
        }
        
        if (!dateText) {
          const patterns = [
            /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?/i,
            /\d{1,2}\/\d{1,2}\/\d{2,4}/,
            /\d{4}-\d{2}-\d{2}/
          ];
          
          for (const pattern of patterns) {
            const match = $e.text().match(pattern);
            if (match) {
              dateText = match[0];
              break;
            }
          }
        }
        
        if (!dateText || dateText.length < 4) return;
        
        // Normalize date
        dateText = String(dateText)
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
          .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
          .trim();
          
        if (!/\d{4}/.test(dateText)) {
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth();
          const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
          const dateLower = dateText.toLowerCase();
          const monthIndex = months.findIndex(m => dateLower.includes(m));
          if (monthIndex !== -1) {
            const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
            dateText = `${dateText}, ${year}`;
          }
        }
        
        const eventUrl = $e.find('a').first().attr('href') || url;
        const fullUrl = eventUrl.startsWith('http') ? eventUrl : 
                       eventUrl.startsWith('/') ? new URL(url).origin + eventUrl : url;
        
        events.push({
          id: uuidv4(),
          title,
          date: dateText,
          venue: { name: venueName, address: address, city: city },
          url: fullUrl,
          source: venueName,
          category: 'Events'
        });
      });
      
    } catch (error) {
      // Silent failure
    }
    
    return filterEvents(events);
  };
}

module.exports = createUniversalScraper;
