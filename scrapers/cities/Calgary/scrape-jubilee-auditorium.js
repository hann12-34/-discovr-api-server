const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

const JubileeAuditoriumEvents = {
    async scrape(city) {
        console.log('🔍 Scraping events from Jubilee Auditorium...');
        try {
            
            const response = await axios.get('https://www.jubileeauditorium.com/calgary/whats-on');
            const $ = cheerio.load(response.data);
            const events = [];

            $('a[href*="/calgary/"]').each((index, element) => {
                const $element = $(element);
                const title = $element.text().trim();
                const link = $element.attr('href');

                
                // Extract description
                const description = $element.text().trim() || $element.closest('div').text().trim() || '';

                if (title && title.length > 5 && !title.toLowerCase().includes('details') && !title.toLowerCase().includes('tickets') && !title.toLowerCase().includes('menu')) {
                    
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
                        date: 'Date TBA',
                        time: null,
                        url: link ? (link.startsWith('http') ? link : 'https://www.jubileeauditorium.com' + link) : 'https://www.jubileeauditorium.com/calgary/whats-on',
                        venue: { name: 'Jubilee Auditorium', address: '1415 14 Avenue NW, Calgary, AB T2N 1M5', city: 'Calgary' },
                        location: 'Calgary, AB',
                        description: description && description.length > 20 ? description : `${title} in Calgary`,
                        image: null
                    });
                }
            });

            console.log(`Found ${events.length} total events from Jubilee Auditorium`);
            return filterEvents(events);
        } catch (error) {
            console.error('Error scraping Jubilee Auditorium events:', error.message);
            return [];
        }
    }
};

module.exports = JubileeAuditoriumEvents.scrape;
