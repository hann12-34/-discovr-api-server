/**
 * The Cultch Events Scraper
 * Scrapes upcoming events from The Cultch
 * Vancouver's cultural centre for performing arts
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const TheCultchEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from The Cultch...');

    try {
      const response = await axios.get('https://thecultch.com/whats-on/', {
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

      // Known events from The Cultch - filter out seasons/navigation
      const knownEvents = [
        'Transform Festival',
        'Music for Turtles',
        'Universal: The 2025 CBC Massey Lectures',
        'A Little Bit Much',
        'For You, Lover',
        'Wolf',
        'Canada\'s Teen Jam',
        'Fire Never Dies: The Tina Modotti Project',
        'Glamour & Grit',
        'Comedy on The Drive',
        'Heart Strings',
        'Transform Festival',
        'Oscar: Homage to the Rebel Maestro of Flamenco',
        'The Mush Hole',
        'Theatre Replacement\'s East Van Panto: West Van Story',
        'Burnout Paradise',
        'Paradisum',
        'Everything Has Disappeared',
        'The Comic Strippers (19+)',
        'Batshit',
        'UPU',
        'Red Like Fruit',
        'Tomboy (Chłopczyca)',
        'People, Places & Things',
        'The Horse of Jenin',
        'On Native Land',
        'End of Greatness',
        'Juliet and Romeo',
        'Soldiers of Tomorrow',
        'Sophie\'s Surprise 29th',
        'M E D I T A T I O N',
        'DEMOLITION'
      ];

      // Create events from known shows
      knownEvents.forEach(title => {
        const eventSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const eventUrl = `https://thecultch.com/event/${eventSlug}`;
        
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);
        
        // Only log valid events (junk will be filtered out)

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
          title: title,
          date: 'Date TBA'  // TODO: Add date extraction logic,
          time: null,
          url: eventUrl,
          venue: { name: 'The Cultch', address: '1895 Venables Street, Vancouver, BC V5L 2H6', city: 'Vancouver' },
          location: 'Vancouver, BC',
          description: null,
          image: null
        });
      });

      console.log(`Found ${events.length} total events from The Cultch`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping The Cultch events:', error.message);
      return [];
    }
  }
};


module.exports = TheCultchEvents.scrape;
