/**
 * Commodore Ballroom Events Scraper
 * Scrapes upcoming events from the Commodore Ballroom website
 * Vancouver's iconic music venue at 868 Granville St
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const DataQualityFilter = require('../../../enhanced-data-quality-filter');

const CommodoreBallroomEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Commodore Ballroom...');
    const filter = new DataQualityFilter();

    try {
      // Get events from multiple months to capture all 60+ shows
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 0-based to 1-based
      
      const eventsUrls = [
        'https://www.commodoreballroom.com',
        'https://www.commodoreballroom.com/shows',
        'https://www.commodoreballroom.com/special-events',
      ];
      
      // Add calendar URLs for past 3 months and next 21 months to capture all events
      for (let i = -3; i < 21; i++) {
        let month = currentMonth + i;
        let year = currentYear;
        
        while (month <= 0) {
          month = month + 12;
          year = year - 1;
        }
        while (month > 12) {
          month = month - 12;
          year = year + 1;
        }
        
        const monthStr = month.toString().padStart(2, '0');
        eventsUrls.push(`https://www.commodoreballroom.com/shows/calendar/${year}-${monthStr}`);
      }

      const events = [];
      const seenUrls = new Set();
      
      // Helper function to validate events
      function isValidEvent(title, url) {
        if (!title || !url) return false;

        // Filter out navigation links, social media, CSS classes, etc.
        const invalidPatterns = [
          /^(home|about|contact|policy|privacy|terms|newsletter|subscribe|follow|book|table|reservation)$/i,
          /^(facebook|twitter|instagram|youtube|tiktok|linkedin)$/i,
          /^(menu|food|drink|gallery|photos|videos)$/i,
          /^(calendar|upcoming|past|archive|view shows|shows|special events|virtual tour)$/i,
          /sample|example|test|demo|placeholder/i,
          /\.css-|overflow:|display:|webkit|font-family|color:|margin|padding/i, // Filter out CSS
          /^\.[\w-]+\{/i, // Filter out CSS class definitions
          /role=group|data-hover|chakra-line-clamp/i // Filter out HTML attributes
        ];

        return !invalidPatterns.some(pattern => pattern.test(title));
      }

      for (const url of eventsUrls) {
        console.log(`Fetching from ${url}`);

        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

        const $ = cheerio.load(response.data);
        console.log(`Loaded page content from ${url}`);

        // Extract JSON event data embedded in the page - more comprehensive approach
        const jsonPattern = /"discovery_id":"[^"]+","tm_id":"[^"]+","name":"([^"]+)","slug":"[^"]+","url":"([^"]+)","type":"[^"]+","start_date_local":"([^"]+)"/g;
        let jsonMatch;
        let jsonEventCount = 0;
        
        while ((jsonMatch = jsonPattern.exec(response.data)) !== null) {
          const [, eventName, eventUrl, eventDate] = jsonMatch;
          
          if (eventUrl && eventName && !seenUrls.has(eventUrl)) {
            seenUrls.add(eventUrl);
            jsonEventCount++;
            
            // Clean event name
            let cleanTitle = eventName
              .replace(/\\u0026/g, '&')
              .replace(/\\"/g, '"')
              .replace(/^[^a-zA-Z0-9]*/, '')
              .trim();
            
            console.log(`✓ JSON Event: ${cleanTitle}`);
            
            events.push({
              id: uuidv4(),
              title: cleanTitle,
              date: eventDate,
              time: null,
              url: eventUrl,
              venue: { name: 'Commodore Ballroom', address: '868 Granville Street, Vancouver, BC V6Z 1K3', city: 'Vancouver' },
              location: 'Vancouver, BC',
              description: `${artist} live at Commodore Ballroom, Vancouver's iconic music venue.`,
              category: 'Concert',
              city: 'Vancouver',
              image: null
            });
          }
        }
        
        if (jsonEventCount > 0) {
          console.log(`Found ${jsonEventCount} events in JSON data from ${url}`);
        }

        // Multiple selectors for different page layouts based on actual site structure
        const eventSelectors = [
          'a[href*="ticketmaster.ca"]',
          'a[href*="ticketmaster.com"]', 
          'a[href*="/event/"]',
          'a[href*="/show/"]',
          'a[href*="event/11"]', // Direct event ID pattern
          'a[href*="110062"]',   // Ticketmaster event ID pattern
          'a[href*="eventbrite"]',
          'a[href*="universe.com"]',
          'a[href*="brownpapertickets"]',
          'a[href*="songkick"]',
          'a[href*="bandsintown"]',
          'a[href*="dice.fm"]',
          'a[href*="seetickets"]',
          'a[href*="stubhub"]',
          'a[href*="vividseats"]',
          'a[href*="tickets.com"]',
          '.featured-shows a',
          '.show-listing a',
          '.event-item a',
          '.show-item a',
          'h3 a',
          'h2 a',
          'h1 a',
          '.artist-name a',
          '.event-title a',
          '.show-title a',
          '[data-testid*="event"] a',
          '.card a',
          '.event-card a',
          '.show-card a',
          'article a',
          '.event a',
          '.show a',
          'a[title]',
          '[role="link"]',
          'a:contains("Tour")',
          'a:contains("Concert")',
          'a:contains("Show")',
          'a:contains("Live")',
          'a:contains("Tickets")',
          'a:contains("Buy")',
          'a:contains("RSVP")',
          'a:contains("Event")'
        ];

        let foundAnyEvents = false;
        for (const selector of eventSelectors) {
          const eventElements = $(selector);
          if (eventElements.length > 0) {
            console.log(`Found ${eventElements.length} events with selector: ${selector}`);
            foundAnyEvents = true;

            eventElements.each((i, element) => {
              try {
                const $element = $(element);
                let title = $element.text().trim() || $element.attr('title')?.trim();
                let eventUrl = $element.attr('href');

                // Clean up CSS classes from title text
                if (title && title.includes('.css-')) {
                  // Extract the actual event name after CSS classes
                  const match = title.match(/}([^}]+)$/);
                  if (match) {
                    title = match[1].trim();
                  }
                }

                if (eventUrl && !eventUrl.startsWith('http')) {
                  eventUrl = `https://www.commodoreballroom.com${eventUrl}`;
                }

                if (isValidEvent(title, eventUrl)) {
                  // Use URL for deduplication to allow multiple dates for same artist
                  if (!seenUrls.has(eventUrl)) {
                    console.log(`✓ Event: ${title}`);
                    seenUrls.add(eventUrl);

                    // Try to find date information
                    let dateText = '';
                    const dateSelectors = [
                      '.date', '.show-date', '.event-date', '.datetime',
                      '[data-date]', '.date-time', '.schedule'
                    ];

                    for (const dateSelector of dateSelectors) {
                      const dateElement = $element.closest('.show-listing, .event-item, .show-item').find(dateSelector).first();
                      if (dateElement.length > 0) {
                        dateText = dateElement.text().trim();
                        break;
                      }
                    }

                    const event = {
                      id: uuidv4(),
                      title: title,
                      url: eventUrl,
                      venue: { name: 'The Commodore Ballroom', address: '868 Granville Street, Vancouver, BC V6Z 1K3', city: 'Vancouver' },
                      location: 'Vancouver, BC',
                      city: 'Vancouver',
                      date: dateText || null,
                      dateText: dateText,
                      source: 'commodore-ballroom'
                    };

                    events.push(event);
                  }
                } else if (title && title.length > 3) {
                  console.log(`✗ Filtered out: "${title}" (URL: ${eventUrl})`);
                }
              } catch (e) {
                console.error(`Error processing event element:`, e.message);
              }
            });
            // Don't break - continue with other selectors to get more events
          }
        }

        if (!foundAnyEvents) {
          console.log(`No events found on ${url} with any selector`);
        }
      }

      console.log(`Found ${events.length} total events from Commodore Ballroom`);
      
      // Second pass: Extract dates from URLs or fetch from pages
      const eventsWithoutDates = events.filter(e => !e.date || !e.dateText);
      if (eventsWithoutDates.length > 0) {
        console.log(`Extracting dates for ${eventsWithoutDates.length} events...`);
        
        for (const event of eventsWithoutDates) {
          try {
            if (!event.url) continue;
            
            // First try: Extract date from URL (common in Ticketmaster URLs)
            // Format: .../MM-DD-YYYY/event/... or .../DD-MM-YYYY/...
            const urlDateMatch = event.url.match(/(\d{2})-(\d{2})-(\d{4})/);
            if (urlDateMatch) {
              const month = urlDateMatch[1];
              const day = urlDateMatch[2];
              const year = urlDateMatch[3];
              event.date = `${year}-${month}-${day}`;
              event.dateText = `${year}-${month}-${day}`;
              console.log(`✓ Extracted date from URL for "${event.title}": ${event.date}`);
              continue;
            }
            
            // Second try: Fetch from event page (if not Ticketmaster)
            if (!event.url.includes('ticketmaster')) {
              const eventPage = await axios.get(event.url, {
                headers: {'User-Agent': 'Mozilla/5.0'},
                timeout: 10000
              });
              
              const $ = cheerio.load(eventPage.data);
              const dateText = $('.date, .event-date, time, [datetime]').first().text().trim();
              
              if (dateText) {
                event.date = dateText;
                event.dateText = dateText;
                console.log(`✓ Found date for "${event.title}": ${dateText}`);
              }
            }
          } catch (err) {
            // Skip events that fail
          }
        }
      }
      
      // Apply data quality filtering
      const cleanedEvents = filter.filterEvents(events);
      return cleanedEvents;

    } catch (error) {
      console.error('Error scraping Commodore Ballroom events:', error.message);
      return [];
    }
  }
};


module.exports = CommodoreBallroomEvents.scrape;
