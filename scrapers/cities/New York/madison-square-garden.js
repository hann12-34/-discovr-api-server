const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class MadisonSquareGarden {
    constructor() {
        this.venueName = 'Madison Square Garden';
        this.venueAddress = '4 Pennsylvania Plaza, New York, NY 10001';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://www.msg.com';
        this.eventsUrl = 'https://www.msg.com/calendar';
    }

    async scrape() {
        try {
            console.log(`🏟️ Scraping events from ${this.venueName}...`);
            
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            // Try multiple selectors for MSG events
            const eventSelectors = [
                '.event-card',
                '.calendar-event',
                'article',
                '[class*="event"]',
                'a[href*="/event/"]'
            ];
            
            eventSelectors.forEach(selector => {
                $(selector).each((i, el) => {
                    const $el = $(el);
                    
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
                    if (!title) title = $el.find('a').first().text().trim();
                    
                    if (!title || title.length < 3) return;
                    
                    // Skip nav/ui elements
                    const titleLower = title.toLowerCase();
                    if (titleLower.includes('menu') || titleLower.includes('search') || 
                        titleLower.includes('filter') || titleLower.includes('calendar') ||
                        title.length > 100) return;
                    
                    const dateText = $el.find('.date, time, [class*="date"]').first().text().trim();
                    const link = $el.find('a').first().attr('href') || $el.attr('href');
                    const url = link ? (link.startsWith('http') ? link : this.baseUrl + link) : this.eventsUrl;
                    
                    
          // COMPREHENSIVE DATE EXTRACTION - Works with most event websites
          let dateText = null;
          
          // Try multiple strategies to find the date
          const dateSelectors = [
            'time[datetime]',
            '[datetime]',
            '.date',
            '.event-date', 
            '.show-date',
            '[class*="date"]',
            'time',
            '.datetime',
            '.when',
            '[itemprop="startDate"]',
            '[data-date]',
            '.day',
            '.event-time',
            '.schedule',
            'meta[property="event:start_time"]'
          ];
          
          // Strategy 1: Look in the event element itself
          for (const selector of dateSelectors) {
            const dateEl = $element.find(selector).first();
            if (dateEl.length > 0) {
              dateText = dateEl.attr('datetime') || dateEl.attr('content') || dateEl.text().trim();
              if (dateText && dateText.length > 0 && dateText.length < 100) {
                console.log(`✓ Found date with ${selector}: ${dateText}`);
                break;
              }
            }
          }
          
          // Strategy 2: Check parent containers if not found
          if (!dateText) {
            const $parent = $element.closest('.event, .event-item, .show, article, [class*="event"], .card, .listing');
            if ($parent.length > 0) {
              for (const selector of dateSelectors) {
                const dateEl = $parent.find(selector).first();
                if (dateEl.length > 0) {
                  dateText = dateEl.attr('datetime') || dateEl.attr('content') || dateEl.text().trim();
                  if (dateText && dateText.length > 0 && dateText.length < 100) {
                    console.log(`✓ Found date in parent with ${selector}: ${dateText}`);
                    break;
                  }
                }
              }
            }
          }
          
          // Strategy 3: Look for common date patterns in nearby text
          if (!dateText) {
            const nearbyText = $element.parent().text();
            // Match patterns like "Nov 4", "November 4", "11/04/2025", etc.
            const datePatterns = [
              /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(,?\s+\d{4})?/i,
              /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
              /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i
            ];
            
            for (const pattern of datePatterns) {
              const match = nearbyText.match(pattern);
              if (match) {
                dateText = match[0].trim();
                console.log(`✓ Found date via pattern matching: ${dateText}`);
                break;
              }
            }
          }
          
          // Clean up the date text
          if (dateText) {
            dateText = dateText.replace(/\s+/g, ' ').trim();
            // Remove common prefixes
            dateText = dateText.replace(/^(Date:|When:|Time:)\s*/i, '');
            // Validate it's not garbage
            if (dateText.length < 5 || dateText.length > 100) {
              console.log(`⚠️  Invalid date text (too short/long): ${dateText}`);
              dateText = null;
            }
          }

          events.push({
                        id: uuidv4(),
                        title,
                        name: title,
                        date: dateText || null,
                        url,
                        venue: { name: this.venueName, address: this.venueAddress, city: 'New York' },
                        location: this.venueLocation,
                        city: 'New York',
                        category: this.determineCategory(title),
                        source: 'madison-square-garden',
                        description: `${title} at Madison Square Garden`
                    });
                });
            });
            
            // Remove duplicates
            const uniqueEvents = [];
            const seen = new Set();
            events.forEach(event => {
                const key = event.title.toLowerCase().substring(0, 30);
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueEvents.push(event);
                }
            });
            
            console.log(`✅ Found ${uniqueEvents.length} events from ${this.venueName}`);
            return uniqueEvents;
            
        } catch (error) {
            console.error(`❌ Error scraping ${this.venueName}:`, error.message);
            return [];
        }
    }

    determineCategory(title) {
        const titleLower = title.toLowerCase();

        if (titleLower.includes('knicks') || titleLower.includes('basketball') || titleLower.includes('nba')) {
            return 'Basketball';
        } else if (titleLower.includes('rangers') || titleLower.includes('hockey') || titleLower.includes('nhl')) {
            return 'Hockey';
        } else if (titleLower.includes('concert') || titleLower.includes('tour') || titleLower.includes('live')) {
            return 'Concert';
        } else if (titleLower.includes('boxing') || titleLower.includes('fight') || titleLower.includes('ufc')) {
            return 'Combat Sports';
        } else if (titleLower.includes('circus') || titleLower.includes('family') || titleLower.includes('show')) {
            return 'Family Entertainment';
        } else if (titleLower.includes('comedy') || titleLower.includes('comedian')) {
            return 'Comedy';
        }

        return 'Event';
    }

}

// Wrapper function for sample runner compatibility
async function scrape(city) {
    const scraper = new MadisonSquareGarden();
    return await scraper.scrape(city);
}

module.exports = { MadisonSquareGarden, scrape };

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new MadisonSquareGarden();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.MadisonSquareGarden = MadisonSquareGarden;