/**
 * The Pearl Vancouver Scraper
 * 
 * This scraper extracts events from The Pearl Vancouver website
 * Website: https://thepearlvancouver.com
 * Events: https://thepearlvancouver.com/all-shows/
 */

const puppeteer = require('puppeteer');

// Venue information
const venue = {
  name: 'The Pearl Vancouver',
  address: '520 W Georgia St',
  city: 'Vancouver',
  province: 'BC',
  postalCode: 'V6B 0M3',
  coordinates: {
    latitude: 49.2816,
    longitude: -123.1178
  },
  country: 'Canada',
  phoneNumber: '',
  website: 'https://thepearlvancouver.com',
  websiteUrl: 'https://thepearlvancouver.com',
  capacity: 550
};

// Default categories for The Pearl events
const defaultCategories = ['music', 'nightlife', 'entertainment', 'concert'];

// List of non-event keywords to filter out
const NON_EVENT_KEYWORDS = [
  'buy tickets', 'tickets', 'book now', 'all shows', 'calendar', 'show gallery',
  'rentals', 'home', 'about', 'contact', 'faq', 'menu', 'gallery',
  'upcoming events', 'past events', 'read more', 'shows', 'events',
  'privacy policy', 'terms of service', 'covid', 'venue info'
];

/**
 * Main scraper function for The Pearl Vancouver
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  console.log('=== STARTING THE PEARL VANCOUVER SCRAPER ===');
  
  // Track environment
  const environment = process.env.NODE_ENV || 'development';
  console.log(`Environment: ${environment}`);
  
  let browser = null;
  const events = [];
  const processedEvents = new Set(); // Track event URLs we've already processed
  
  try {
    // Configure Puppeteer
    const puppeteerOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    };

    // Allow for custom executable path in production environments
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      console.log(`Using custom Puppeteer executable path: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
      puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    // Launch browser
    console.log('Launching browser...');
    browser = await puppeteer.launch(puppeteerOptions);
    
    // Create new page
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    // Set longer navigation timeouts for potentially slow websites
    page.setDefaultNavigationTimeout(60000);
    
    // Navigate to events page
    console.log('Navigating to The Pearl Vancouver shows page...');
    await page.goto('https://thepearlvancouver.com/all-shows/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for the page to load content - compatible with all Puppeteer versions
    await new Promise(resolve => setTimeout(resolve, 5000)); // Give JS time to execute
    
    // Extract event links - specifically look for concert/event detail pages
    console.log('Extracting events from The Pearl Vancouver...');
    const eventLinks = await page.evaluate(() => {
      const results = [];
      
      // Only look for links that point to event detail pages
      // This helps filter out navigation, buttons, etc.
      const links = document.querySelectorAll('a[href*="/tm-event/"]');
      
      links.forEach(link => {
        // Skip links without text content
        if (!link.textContent || link.textContent.trim().length === 0) return;
        
        // Skip links with very short text (likely navigation)
        const text = link.textContent.trim();
        if (text.length < 4) return;
        
        // Skip "Buy Tickets", "More Info", etc.
        if (/buy|tickets|more info|learn more|calendar|shows|events|view|rentals/i.test(text)) return;
        
        // Create result object
        results.push({
          title: text,
          link: link.href
        });
      });
      
      return results;
    });
    
    console.log(`Found ${eventLinks.length} Pearl event links`);
    
    // Process each event link to get detailed information
    for (let i = 0; i < eventLinks.length; i++) {
      const eventLink = eventLinks[i];
      console.log(`Processing event ${i+1}/${eventLinks.length}: ${eventLink.title}`);
      
      // Skip if we've already processed this URL
      if (processedEvents.has(eventLink.link)) {
        console.log(`Skipping duplicate URL: ${eventLink.link}`);
        continue;
      }
      
      processedEvents.add(eventLink.link);
      
      try {
        // Navigate to the event detail page
        await page.goto(eventLink.link, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Extract event details using multiple fallback strategies
        const eventDetails = await page.evaluate(() => {
          // Try to find event image with multiple selectors
          let imageUrl = null;
          const imageSelectors = [
            '.event-image img', '.event-banner img', 'article img', '.tm-event-featured-image img',
            '.featured-image img', '.wp-post-image', '.attachment-large', 'header img'
          ];
          
          for (const selector of imageSelectors) {
            const image = document.querySelector(selector);
            if (image && image.src && !image.src.includes('placeholder')) {
              imageUrl = image.src;
              break;
            }
          }
          
          // Try to find event date with multiple approaches
          let dateText = '';
          const dateSelectors = [
            '.event-date', '.date', 'time', '[class*="date"]', '.calendar-date',
            '.event-meta time', '.event-details time', '.show-date', 'span.date',
            // Try to find structured data
            'script[type="application/ld+json"]'
          ];
          
          // First try regular date elements
          for (const selector of dateSelectors) {
            if (selector.includes('script')) {
              // Try to extract from JSON-LD data
              const jsonScripts = document.querySelectorAll(selector);
              for (const script of jsonScripts) {
                try {
                  const data = JSON.parse(script.textContent);
                  if (data && (data.startDate || (data['@graph'] && data['@graph'][0] && data['@graph'][0].startDate))) {
                    const startDate = data.startDate || (data['@graph'] && data['@graph'][0] && data['@graph'][0].startDate);
                    dateText = startDate;
                    break;
                  }
                } catch (e) {
                  // JSON parsing failed, continue to next script
                }
              }
            } else {
              const dateEl = document.querySelector(selector);
              if (dateEl && dateEl.textContent && dateEl.textContent.trim()) {
                dateText = dateEl.textContent.trim();
                break;
              }
            }
          }
          
          // If date is still not found, try looking for date patterns in the page content
          if (!dateText) {
            // Look for date patterns in the page text content
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            // Get all text nodes in the page
            const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span');
            
            for (const el of textElements) {
              const text = el.textContent.trim();
              
              // Look for month names followed by a day
              for (const month of [...monthNames, ...monthShortNames]) {
                const regex = new RegExp(`${month}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s*\\d{4})?`, 'i');
                const match = text.match(regex);
                if (match) {
                  dateText = match[0];
                  break;
                }
              }
              
              if (dateText) break;
            }
          }
          
          // Try to find event time with multiple selectors
          let timeText = '';
          const timeSelectors = [
            '.event-time', '.time', '[class*="time"]', '.doors', '.show-time',
            '.event-details .time', '.event-meta .time'
          ];
          
          for (const selector of timeSelectors) {
            const timeEl = document.querySelector(selector);
            if (timeEl && timeEl.textContent && timeEl.textContent.trim()) {
              timeText = timeEl.textContent.trim();
              break;
            }
          }
          
          // If time still not found, look for time patterns
          if (!timeText) {
            const textElements = document.querySelectorAll('p, div, span');
            for (const el of textElements) {
              const text = el.textContent.trim();
              const timeRegex = /\b(?:(?:1[0-2]|0?[1-9]):[0-5][0-9](?:\s*[ap]m)?|(?:1[0-2]|0?[1-9])\s*[ap]m)\b/i;
              const match = text.match(timeRegex);
              if (match) {
                timeText = match[0];
                break;
              }
            }
          }
          
          // Try to find description with multiple selectors
          let description = '';
          const descSelectors = [
            '.event-content', '.event-description', '.content', 'article p',
            '.description', '.show-description', '.event-details p'
          ];
          
          for (const selector of descSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements && elements.length) {
              let descText = '';
              elements.forEach(el => {
                descText += el.textContent.trim() + ' ';
              });
              if (descText.trim()) {
                description = descText.trim();
                break;
              }
            }
          }
          
          // Try to find price information
          let priceText = '';
          const priceSelectors = [
            '.event-price', '.price', '[class*="price"]', '.ticket-price',
            '.event-details .price', '.cost', '.admission'
          ];
          
          for (const selector of priceSelectors) {
            const priceEl = document.querySelector(selector);
            if (priceEl && priceEl.textContent && priceEl.textContent.trim()) {
              priceText = priceEl.textContent.trim();
              break;
            }
          }
          
          // If price not found directly, look for price patterns
          if (!priceText) {
            const textElements = document.querySelectorAll('p, div, span');
            for (const el of textElements) {
              const text = el.textContent.trim();
              const priceRegex = /\$\d+(\.\d{2})?/;
              const match = text.match(priceRegex);
              if (match) {
                priceText = match[0];
                break;
              }
            }
          }
          
          // Try to find ticket URL with multiple approaches
          let ticketUrl = '';
          const ticketSelectors = [
            'a[href*="ticket"]', 'a.button', 'a.btn', 'a.tickets', 
            'a[href*="eventbrite"]', 'a[href*="ticketmaster"]', 'a.buy'
          ];
          
          for (const selector of ticketSelectors) {
            const ticketEl = document.querySelector(selector);
            if (ticketEl && ticketEl.href) {
              ticketUrl = ticketEl.href;
              break;
            }
          }
          
          // Extract specific event title from page (don't rely only on link text)
          let pageTitle = '';
          const titleSelectors = [
            'h1', 'h1.event-title', '.event-title', '.show-title',
            'article h1', 'article h2', '.entry-title', 'header h1', 'title'
          ];
          
          for (const selector of titleSelectors) {
            const titleEl = document.querySelector(selector);
            if (titleEl && titleEl.textContent && titleEl.textContent.trim()) {
              const title = titleEl.textContent.trim();
              // Skip generic titles or navigation elements
              if (title.length > 3 && 
                  !['home', 'events', 'shows', 'all shows', 'tickets', 'buy tickets'].includes(title.toLowerCase())) {
                pageTitle = title;
                break;
              }
            }
          }
          
          return {
            pageTitle,
            dateText,
            timeText,
            imageUrl,
            description,
            ticketUrl,
            priceText
          };
        });
        
        // Parse date and time
        let startDate = null;
        if (eventDetails.dateText) {
          try {
            // Format could be: "June 29" or "June 29, 2025"
            const dateText = eventDetails.dateText;
            const timeText = eventDetails.timeText || '8:00pm'; // Default to 8:00pm if no time
            
            // Parse the date text
            let month, day, year;
            
            // First, try to extract month and day
            const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d+)(?:,\s*(\d{4}))?/);
            if (dateMatch) {
              const monthMap = {
                'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
                'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
              };
              
              const monthName = dateMatch[1].toLowerCase();
              month = monthMap[monthName];
              day = parseInt(dateMatch[2]);
              year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
              
              // Parse time
              let hour = 20; // Default to 8pm
              let minute = 0;
              
              if (timeText) {
                // Handle formats like "8:00pm", "8pm", "20:00"
                const timeMatch = timeText.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
                if (timeMatch) {
                  hour = parseInt(timeMatch[1]);
                  minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                  
                  // Adjust hour for PM
                  const isPM = timeMatch[3] && timeMatch[3].toLowerCase() === 'pm';
                  if (isPM && hour < 12) {
                    hour += 12;
                  }
                  // Adjust for AM 12 hour
                  const isAM = timeMatch[3] && timeMatch[3].toLowerCase() === 'am';
                  if (isAM && hour === 12) {
                    hour = 0;
                  }
                }
              }
              
              if (month !== undefined) {
                startDate = new Date(year, month, day, hour, minute);
                
                // If the date is in the past, assume it's next year
                if (startDate < new Date()) {
                  startDate.setFullYear(year + 1);
                }
              }
            }
          } catch (error) {
            console.log(`Error parsing date: ${error.message}`);
          }
        }
        
        // Use the page title if available (more accurate than the link text)
        // Otherwise fall back to the link text
        const eventTitle = eventDetails.pageTitle || eventLink.title;
        
        // Skip if title is missing or generic
        if (!eventTitle || eventTitle.length < 3 || eventTitle.toLowerCase() === 'the pearl' || eventTitle.toLowerCase() === 'the pearl vancouver') {
          console.log(`Skipping event with missing or generic title: ${eventLink.link}`);
          continue;
        }
        
        // Parse price information if available
        let price = 'TBD';
        if (eventDetails.priceText) {
          // Extract numeric price if available
          const priceMatch = eventDetails.priceText.match(/\$\d+(\.\d{2})?/);
          if (priceMatch) {
            price = priceMatch[0];
          } else {
            price = eventDetails.priceText;
          }
        }
        
        // Use ISO date string if available from JSON-LD
        if (eventDetails.dateText && eventDetails.dateText.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
          try {
            startDate = new Date(eventDetails.dateText);
          } catch (e) {
            console.log(`Error parsing ISO date: ${eventDetails.dateText}`);
          }
        }
        
        // If we still don't have a valid date after parsing, try harder with regex
        if (!startDate || isNaN(startDate.getTime())) {
          console.log(`No valid date found for event: ${eventTitle}, attempting stronger parsing...`);
          
          // Look for any date-like patterns in the description and all extracted text
          const allText = `${eventDetails.dateText} ${eventDetails.timeText} ${eventDetails.description}`;
          const dateRegex = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?/i;
          const dateMatch = allText.match(dateRegex);
          
          if (dateMatch) {
            console.log(`Found date pattern: ${dateMatch[0]}`);
            try {
              // Try to parse with date-fns or similar library if available
              // For now, basic parsing
              const dateStr = dateMatch[0];
              const now = new Date();
              const thisYear = now.getFullYear();
              
              startDate = new Date(dateStr + (dateStr.includes(thisYear) ? '' : `, ${thisYear}`));
              
              // If date is in the past, assume it's next year
              if (startDate < now && startDate.getFullYear() === thisYear) {
                startDate.setFullYear(thisYear + 1);
              }
            } catch (e) {
              console.log(`Error parsing found date pattern: ${e.message}`);
            }
          }
        }
        
        // Generate unique ID using date and title
        const dateString = startDate && !isNaN(startDate.getTime()) ? startDate.toISOString().split('T')[0] : '';
        const randomComponent = Math.random().toString(36).substring(2, 8);
        const safeTitle = eventTitle.toLowerCase().replace(/\s+/g, '-').substring(0, 20);
        const eventId = `pearl-${dateString}-${safeTitle}-${randomComponent}`.replace(/[^a-z0-9-]/gi, '-');
        
        // Get a better description
        let description = eventDetails.description;
        if (!description || description.length < 10) {
          // Try to build a basic description from the event details
          description = `${eventTitle} at The Pearl Vancouver.`;
          if (dateString) {
            description += ` Event date: ${dateString}.`;
          }
          if (price !== 'TBD') {
            description += ` Tickets: ${price}.`;
          }
        }
        
        const event = {
          id: eventId,
          title: eventTitle, // Use the better title from the page
          source: 'pearl-vancouver-scraper',
          description: description,
          startDate: startDate,
          venue: {
            ...venue
          },
          price: price,
          category: 'music',
          categories: [...defaultCategories],
          sourceURL: eventLink.link,
          ticketURL: eventDetails.ticketUrl || eventLink.link,
          image: eventDetails.imageUrl || null,
          location: venue.name,
          lastUpdated: new Date()
        };
        
        events.push(event);
      } catch (error) {
        console.log(`Error processing event ${eventLink.title}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error(`Error in Pearl Vancouver scraper: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
  
  // If no events found from the scraper, just report it
  if (events.length === 0) {
    console.log('No events found from The Pearl Vancouver website.');
  } else {
    // Output first event details for debugging
    console.log('=== THE PEARL VANCOUVER SCRAPER RESULTS ===');
    console.log(`Found ${events.length} events`);
    console.log('First event details:');
    console.log(`- Title: ${events[0].title}`);
    console.log(`- ID: ${events[0].id}`);
    console.log(`- Date: ${events[0].startDate}`);
    console.log(`- Venue: ${events[0].venue.name}`);
    console.log(`- SourceURL: ${events[0].sourceURL}`);
    console.log(`And ${events.length - 1} more events...`);
    console.log('=== THE PEARL VANCOUVER SCRAPER FINISHED ===');
  }
  
  return events;
}

module.exports = {
  sourceIdentifier: 'pearl-vancouver',
  scrape
};
