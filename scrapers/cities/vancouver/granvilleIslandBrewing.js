/**
 * Granville Island Brewing Scraper
 * Scrapes events from Granville Island Brewing
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const GranvilleIslandBrewingEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Granville Island Brewing...');

    try {
      const response = await axios.get('https://granvilleislandbrewing.com/', {
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
        'a[href*="/tour"]',
        'a[href*="/tasting"]',
        '.event-item a',
        '.tour-item a',
        'article a',
        '.post a',
        'h2 a',
        'h3 a',
        'a:contains("Event")',
        'a:contains("Tour")',
        'a:contains("Tasting")',
        'a:contains("Brewery")',
        'a:contains("Beer")',
        'a:contains("Experience")',
        'a:contains("Visit")',
        'a:contains("Taproom")'
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
            url = 'https://granvilleislandbrewing.com' + url;
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
            url: url,
            venue: { name: 'Granville Island Brewing', address: '1441 Cartwright Street, Vancouver, BC V6H 3R7', city: 'Vancouver' },
            city: 'Vancouver',
            date: dateText || null,
            source: 'Granville Island Brewing'
          });
        });
      }

      console.log(`Found ${events.length} total events from Granville Island Brewing`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Granville Island Brewing events:', error.message);
      return [];
    }
  }
};


module.exports = GranvilleIslandBrewingEvents.scrape;
