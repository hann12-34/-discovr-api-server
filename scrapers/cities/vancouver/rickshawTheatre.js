/**
 * Rickshaw Theatre Events Scraper
 * Scrapes upcoming events from Rickshaw Theatre
 * Vancouver's historic live music venue
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const RickshawTheatreEvents = {
  async scrape(city) {
    console.log('🎸 Scraping Rickshaw Theatre with headless browser...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      console.log('Loading Rickshaw Theatre page...');
      await page.goto('https://www.rickshawtheatre.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract event data from the page
      const eventData = await page.evaluate(() => {
        const events = [];
        const links = document.querySelectorAll('a[href*="eventbrite"]');

        links.forEach(link => {
          const container = link.closest('div, article, section');
          if (!container) return;

          let title = '';
          const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          if (titleEl) {
            title = titleEl.textContent.trim();
          }

          // Get date
          let date = '';
          const dateEl = container.querySelector('.date, time, [class*="date"]');
          if (dateEl) {
            date = dateEl.textContent.trim();
          }

          if (title && title.length > 3 && !title.toLowerCase().includes('get tickets')) {
            
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
            dateText = dateText
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
              .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
              .trim();
            // Remove common prefixes
            dateText = dateText.replace(/^(Date:|When:|Time:)\s*/i, '');
            
            if (dateText && !/\d{4}/.test(dateText)) {
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
            // Validate it's not garbage
            if (dateText.length < 5 || dateText.length > 100) {
              console.log(`⚠️  Invalid date text (too short/long): ${dateText}`);
              dateText = null;
            }
          }

          events.push({
              title,
              date,
              url: link.href
            });
          }
        });

        return filterEvents(events);
      });

      console.log(`Found ${eventData.length} events from Rickshaw Theatre`);

      const events = [];
      const seen = new Set();

      eventData.forEach(({ title, date, url }) => {
        if (seen.has(url)) return;
        seen.add(url);

        console.log(`✓ ${title} | ${date || 'TBD'}`);

        events.push({
          id: uuidv4(),
          title: title,
          date: date || null,
          time: null,
          url: url,
          venue: { name: 'Rickshaw Theatre', address: '254 East Hastings Street, Vancouver, BC V6A 1P1', city: 'Vancouver' },
          location: 'Vancouver, BC',
          description: `${title} at Rickshaw Theatre.`,
          category: 'Concert',
          city: 'Vancouver',
          image: null,
          source: 'Rickshaw Theatre'
        });
      });

      console.log(`\n✅ Found ${events.length} Rickshaw Theatre events`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Rickshaw Theatre events:', error.message);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};


module.exports = RickshawTheatreEvents.scrape;
