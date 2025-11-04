/**
 * Queen Elizabeth Theatre Events Scraper
 * Scrapes upcoming events from Queen Elizabeth Theatre
 * Vancouver's premier performing arts venue
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const QueenElizabethTheatreEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Queen Elizabeth Theatre...');

    try {
      const response = await axios.get('https://vancouvercivictheatres.com/', {
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

      // Look for event containers and extract proper event titles
      const eventContainers = $('.h-hero-events__item, .event-item, .hero-event');
      
      eventContainers.each((i, container) => {
        const $container = $(container);
        
        // Get the event URL
        let eventUrl = $container.attr('href') || $container.find('a').first().attr('href');
        if (!eventUrl) return;
        
        if (!eventUrl.startsWith('http')) {
          eventUrl = 'https://vancouvercivictheatres.com' + eventUrl;
        }
        
        if (seenUrls.has(eventUrl)) return;
        
        // Extract title from URL slug as fallback
        let title = '';
        const urlMatch = eventUrl.match(/\/events\/([^\/]+)/);
        if (urlMatch) {
          title = urlMatch[1]
            .replace(/vct-/gi, '')
            .replace(/presents-/gi, '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        
        // Try to get better title from container text
        const containerText = $container.text().trim();
        if (containerText && containerText.length > 3 && !containerText.toLowerCase().includes('get tickets')) {
          const lines = containerText.split('\n').map(line => line.trim()).filter(line => line.length > 3);
          if (lines.length > 0) {
            title = lines[0];
          }
        }
        
        // Skip generic terms
        const skipTerms = ['get tickets', 'details', 'buy tickets', 'menu', 'contact', 'about'];
        if (skipTerms.some(term => title.toLowerCase().includes(term))) {
          return;
        }
        
        if (!title || title.length < 3) return;
        
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
          date: null,  // TODO: Add date extraction logic
          url: eventUrl,
          venue: { name: 'Queen Elizabeth Theatre', address: '630 Hamilton Street, Vancouver, BC V6B 5N6', city: 'Vancouver' },
          location: 'Vancouver, BC',
          description: null,
          image: null
        });
      });
      
      // Also look for regular event links on the page
      $('a[href*="/events/"]').each((i, link) => {
        const $link = $(link);
        let url = $link.attr('href');
        
        if (!url) return;
        
        // Normalize URL for deduplication
        const normalizedUrl = url.replace(/\/$/, '').toLowerCase();
        if (seenUrls.has(normalizedUrl)) return;
        
        if (!url.startsWith('http')) {
          url = 'https://vancouvercivictheatres.com' + url;
        }
        
        // Extract title from URL slug
        const urlMatch = url.match(/\/events\/([^\/]+)/);
        if (!urlMatch) return;
        
        let title = urlMatch[1]
          .replace(/vct-/gi, '')
          .replace(/presents-/gi, '')
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        const skipTerms = ['get tickets', 'details', 'buy tickets'];
        if (skipTerms.some(term => title.toLowerCase().includes(term))) {
          return;
        }
        
        if (title.length < 3) return;
        
        seenUrls.add(normalizedUrl);
        // Only log valid events (junk will be filtered out)
        
        events.push({
          id: uuidv4(),
          title: title,
          date: null,  // TODO: Add date extraction logic
          url: url,
          venue: { name: 'Queen Elizabeth Theatre', address: '630 Hamilton Street, Vancouver, BC V6B 5N6', city: 'Vancouver' },
          location: 'Vancouver, BC',
          description: null,
          image: null
        });
      });

      console.log(`Found ${events.length} total events from Queen Elizabeth Theatre`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Queen Elizabeth Theatre events:', error.message);
      return [];
    }
  }
};


module.exports = QueenElizabethTheatreEvents.scrape;
