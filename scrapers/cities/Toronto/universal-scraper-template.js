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
      
      // Try EXTENSIVE event container selectors
      const containers = new Set();
      const selectors = [
        // Event classes
        '.event', '[class*="event"]', '[class*="Event"]', '[id*="event"]',
        '.show', '[class*="show"]', '[class*="Show"]',
        '.concert', '[class*="concert"]', '.performance', '[class*="performance"]',
        '.listing', '[class*="listing"]', '.list-item',
        
        // Card/container patterns
        'article', '.card', '[class*="card"]', '[class*="Card"]',
        '.item', '[class*="item"]', 'li[class*="item"]',
        '.entry', '[class*="entry"]', '.post',
        
        // Grid/list patterns
        '.grid-item', '[class*="grid"]', '.list-group-item',
        '.row', '[class*="row"]', '.col',
        
        // Data attributes
        '[data-event]', '[data-show]', '[data-performance]',
        '[data-date]', '[data-title]',
        
        // Date-containing elements (work backwards)
        'time', '[datetime]', '.date', '[class*="date"]',
        '.when', '.schedule', '.calendar'
      ];
      
      // First pass: direct selectors
      selectors.forEach(sel => {
        try {
          $(sel).each((i, el) => {
            if (i < 100) containers.add(el);
          });
        } catch (e) {}
      });
      
      // Second pass: find parents of date elements
      $('time, [datetime], .date, [class*="date"]').each((i, el) => {
        if (i < 50) {
          let parent = $(el).parent()[0];
          for (let depth = 0; depth < 4 && parent; depth++) {
            containers.add(parent);
            parent = $(parent).parent()[0];
          }
        }
      });
      
      Array.from(containers).forEach((el) => {
        const $e = $(el);
        
        // Extract title - try MANY patterns
        let title = '';
        const titleSelectors = [
          'h1', 'h2', 'h3', 'h4', 'h5',
          '.title', '[class*="title"]', '[class*="Title"]',
          '.name', '[class*="name"]', '[class*="Name"]',
          '.headline', '[class*="headline"]',
          '.event-title', '.show-title', '.performance-title',
          'a[href*="/event"]', 'a[href*="/show"]',
          'strong', 'b', '.artist', '[class*="artist"]',
          'a'
        ];
        
        for (const sel of titleSelectors) {
          const text = $e.find(sel).first().text().trim();
          if (text && text.length >= 5 && text.length < 250) {
            title = text;
            break;
          }
        }
        
        if (!title || title.length < 5) return;
        if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|View All|Load More|Filter|Sort|Click|Read More|Learn More|See All)/i)) return;
        
        // Extract date - try MANY patterns
        let dateText = '';
        
        // Try datetime attribute first
        const dateEl = $e.find('[datetime]').first();
        if (dateEl.length) {
          dateText = dateEl.attr('datetime') || dateEl.text().trim();
        }
        
        // Try common date selectors
        if (!dateText) {
          const dateSelectors = [
            'time', '.date', '[class*="date"]', '[class*="Date"]',
            '.when', '.schedule', '.datetime',
            '[class*="time"]', '[class*="day"]',
            '.event-date', '.show-date', '.concert-date'
          ];
          
          for (const sel of dateSelectors) {
            const text = $e.find(sel).first().text().trim();
            if (text && text.length >= 4) {
              dateText = text;
              break;
            }
          }
        }
        
        // Try regex patterns in full text
        if (!dateText) {
          const fullText = $e.text();
          const patterns = [
            // Full date formats
            /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{1,2}(?:st|nd|rd|th)?[\s,]+\d{4}/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?/i,
            // Numeric formats
            /\d{1,2}\/\d{1,2}\/\d{2,4}/,
            /\d{4}-\d{2}-\d{2}/,
            /\d{1,2}-\d{1,2}-\d{4}/,
            // Day, Month Day patterns
            /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i
          ];
          
          for (const pattern of patterns) {
            const match = fullText.match(pattern);
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
