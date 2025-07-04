/**
 * Canada Place Events Scraper
 * Scrapes events from Canada Place website (https://www.canadaplace.ca/events)
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class CanadaPlaceEvents {
  constructor() {
    this.name = 'Canada Place Events';
    this.url = 'https://www.canadaplace.ca/events';
    this.sourceIdentifier = 'canada-place';
    this.venue = {
      name: 'Canada Place',
      address: '999 Canada Place, Vancouver, BC V6C 3E1',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2888, lng: -123.1111 }
    };
  }

  /**
   * Scrape events from Canada Place website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping Canada Place Events...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set higher timeout for slow sites
    await page.setDefaultNavigationTimeout(60000);
    
    try {
      // For better discovery, don't block any resources
      // This allows us to see the full page structure
      
      // Go to the events page
      console.log(`Navigating to ${this.url}...`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2',
        timeout: 45000 
      });
      
      console.log('Page loaded, extracting events...');
      
      // First pass: extract events directly from the main page
      let events = await this.extractEvents(page);
      console.log(`First pass found ${events.length} events`);
      
      // Second pass: If main page extraction yielded few results,
      // try to find and follow event links to extract more details
      if (events.length < 4) {
        console.log('Not enough events found. Exploring deeper...');
        
        // Find all potential event links using broader criteria
        const eventLinks = await page.evaluate(() => {
          // More extensive link discovery - grab anything that looks like an event
          const allLinks = Array.from(document.querySelectorAll('a'));
          
          // Keep track of found links to avoid duplicates
          const uniqueLinks = new Set();
          
          // Filter for potential event links
          const potentialEventLinks = allLinks.filter(link => {
            const href = link.href;
            if (!href || href.includes('#') || href.endsWith('.pdf') || href.endsWith('.jpg') || href.includes('login') || href.includes('mailto:')) {
              return false;
            }
            
            // Already found this link
            if (uniqueLinks.has(href)) return false;
            
            // Add to unique links
            uniqueLinks.add(href);
            
            // Check for obvious event links
            if (href.includes('event/') || href.includes('events/')) return true;
            
            // Check for keywords in link text or URL that suggest it's an event
            const linkText = link.textContent.trim().toLowerCase();
            const urlLower = href.toLowerCase();
            
            const eventKeywords = ['port day', 'zumba', 'christmas', 'canada together', 
                                 'festival', 'concert', 'show', 'performance', 
                                 'celebration', 'happening'];
            
            return eventKeywords.some(keyword => linkText.includes(keyword) || urlLower.includes(keyword));
          });
          
          return potentialEventLinks.map(link => link.href);
        });
        
        console.log(`Found ${eventLinks.length} potential event detail links to explore`);
        
        console.log(`Found ${eventLinks.length} potential event detail links to explore`);
        
        // Also look for keywords on the main page that might indicate events we're missing
        const additionalEventNames = await page.evaluate(() => {
          const eventKeywords = ['port day', 'zumba', 'christmas', 'canada together'];
          const potentialEvents = [];
          
          // Find headings that might contain event names
          document.querySelectorAll('h1, h2, h3, h4, h5').forEach(heading => {
            const text = heading.textContent.trim();
            if (text.length > 5 && text.length < 100) {
              eventKeywords.forEach(keyword => {
                if (text.toLowerCase().includes(keyword)) {
                  potentialEvents.push({
                    title: text,
                    element: 'heading'
                  });
                }
              });
            }
          });
          
          // Find paragraphs that might mention events
          document.querySelectorAll('p').forEach(p => {
            const text = p.textContent.trim();
            eventKeywords.forEach(keyword => {
              if (text.toLowerCase().includes(keyword)) {
                // Try to extract just the event name, not the whole paragraph
                const sentences = text.split(/(\.|\!|\?)/);
                for (const sentence of sentences) {
                  if (sentence.toLowerCase().includes(keyword) && sentence.length < 100) {
                    potentialEvents.push({
                      title: sentence.trim(),
                      element: 'paragraph'
                    });
                    break;
                  }
                }
              }
            });
          });
          
          return potentialEvents;
        });
        
        console.log(`Found ${additionalEventNames.length} potential events from text content`);
        
        // Process these potential events from text content
        for (const eventInfo of additionalEventNames) {
          // Skip if it's just a generic mention
          if (eventInfo.title.toLowerCase().includes('events at canada place')) continue;
          
          // Try to extract a proper event name
          let eventName = eventInfo.title;
          
          // Try to get just the event name, not the whole sentence
          const eventKeywords = ['port day', 'zumba', 'christmas', 'canada together'];
          for (const keyword of eventKeywords) {
            if (eventInfo.title.toLowerCase().includes(keyword)) {
              // Get the part of the sentence with the keyword
              const words = eventInfo.title.split(' ');
              let startIndex = 0;
              let endIndex = words.length - 1;
              
              // Find the keyword in the words array
              for (let i = 0; i < words.length; i++) {
                if (words[i].toLowerCase().includes(keyword.split(' ')[0])) {
                  // Start a few words before the keyword
                  startIndex = Math.max(0, i - 2);
                  // End a few words after the keyword
                  endIndex = Math.min(words.length - 1, i + keyword.split(' ').length + 2);
                  break;
                }
              }
              
              // Extract just this part of the title
              eventName = words.slice(startIndex, endIndex + 1).join(' ');
              break;
            }
          }
          
          // Create a synthetic event with this name
          events.push({
            title: eventName,
            dateText: '',  // We'll determine date later based on name
            description: `${eventName} at Canada Place`,
            image: '',
            link: this.url,
            venue: this.venue
          });
          
          console.log(`Added event from text content: ${eventName}`);
        }
        
        // Visit each event page to extract more detailed information
        for (const eventLink of eventLinks.slice(0, 15)) { // Allow more requests to find more events
          try {
            console.log(`Exploring event link: ${eventLink}`);
            await page.goto(eventLink, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Extract the event details from this page
            const eventDetail = await this.extractSingleEventPage(page);
            
            if (eventDetail) {
              // Check if this is a duplicate by normalizing the title
              const normalizedTitle = this.normalizeTitle(eventDetail.title);
                
              // Check if we've already found this event
              const isDuplicate = events.some(existingEvent => 
                this.normalizeTitle(existingEvent.title) === normalizedTitle);
                
              if (!isDuplicate) {
                events.push(eventDetail);
                console.log(`Added event: ${eventDetail.title}`);
              } else {
                console.log(`Skipped duplicate event: ${eventDetail.title}`);
              }
            }
          } catch (err) {
            console.log(`Error exploring event link ${eventLink}: ${err.message}`);
            // Continue with the next link even if one fails
          }
        }
        
        // Go back to the main events page
        await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log(`After deep exploration, found total of ${events.length} events`);
      }
      
      // Filter out any invalid events
      // Process all events with category determination and date parsing
      // Use a Map to deduplicate events based on normalized titles
      const eventMap = new Map();
      
      for (const event of events) {
        if (!event) continue; // Skip null/undefined events
        
        try {
          // Normalize the title to help with deduplication
          const normalizedTitle = this.normalizeTitle(event.title);
          
          // Skip if we've already processed this event by normalized title
          if (eventMap.has(normalizedTitle)) continue;
          
          const { startDate, endDate } = this.parseDates(event.dateText);
          
          // Generate a unique ID based on title and date
          const id = slugify(`canada-place-${event.title}-${startDate.getTime()}`, {
            lower: true,
            strict: true
          });
          
          // Determine categories based on title
          const categories = this.determineCategories(event.title);
          
          // Store event in map by normalized title
          eventMap.set(normalizedTitle, {
            id,
            title: event.title,
            startDate,
            endDate,
            description: event.description,
            image: event.image,
            link: event.link,
            sourceIdentifier: this.sourceIdentifier,
            venue: this.venue,
            categories,
            lastUpdated: new Date()
          });
          
          console.log(`Processed event: ${event.title} (normalized: ${normalizedTitle})`);
        } catch (err) {
          console.error(`Error processing event ${event.title}: ${err.message}`);
        }
      }
      
      // Convert map to array of events
      const processedEvents = Array.from(eventMap.values());
      
      // Filter out any invalid events
      const validEvents = processedEvents.filter(event => 
        event && event.categories && 
        Array.isArray(event.categories) && 
        !event.categories.includes('Invalid')
      );
      
      // Close the browser
      await browser.close();
      
      console.log(`Found ${validEvents.length} valid events out of ${processedEvents.length} total`);
      
      return validEvents;
    } catch (error) {
      console.error(`Error scraping Canada Place events: ${error.message}`);
      
      // Take an error screenshot to help debug issues
      try {
        await page.screenshot({ path: '/tmp/canada-place-error.png' });
        console.log('Error screenshot saved to /tmp/canada-place-error.png');
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError.message);
      }
      
      // Make sure to close the browser on error
      await browser.close();
      
      // Return empty array on error
      return [];
    }
  }

  /**
   * Extract events from the Canada Place website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    console.log('Extracting events from Canada Place website');
    
    // Wait for content to load - use a broader set of selectors
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Take a screenshot for debugging purposes
    await page.screenshot({ path: '/tmp/canada-place-debug.png' });
    console.log('Took screenshot to /tmp/canada-place-debug.png for debugging');
    
    // Extract events using an advanced page.evaluate with multiple selector strategies
    const extractedEvents = await page.evaluate((venueInfo) => {
      console.log('Starting event extraction');
      
      // Look for event details in the main content area
      const mainContent = document.querySelector('#main-content, .main-content, main');
      console.log('Main content found:', !!mainContent);
      
      // Enhanced approach to find all possible events on the page
      const results = [];
      
      // Words that clearly indicate navigation elements rather than events
      const navigationWords = [
        'calendar', 'category', 'filter', 'search', 'navigation', 'view', 'filters', 
        'events', 'english', 'français', 'menu', 'home', 'contact', 'about', 'map', 
        'directions', 'login', 'register', 'sign in', 'signup'
      ];
      
      // Track processed titles to avoid duplicates
      const processedTitles = new Set();
      
      // STRATEGY 1: Find event cards through various selector patterns
      // Try multiple selector combinations that might represent events
      const cardSelectors = [
        // Common event card selectors
        '.card', '.event-card', 'article', '.event', '.event-item',
        // Layout-based selectors that might contain events
        '.col-md-6', '.col-sm-6', '.views-row', '.event-list-item',
        // Additional pattern-matching selectors
        '[class*="event"]', '[id*="event"]', '.teaser', '.node--type-event',
        // Common CMS patterns
        '.views-row', '.field--item'
      ];

      // Combine all selectors for better performance
      const combinedSelector = cardSelectors.join(',');
      const eventElements = document.querySelectorAll(combinedSelector);
      console.log(`Found ${eventElements.length} potential event elements`);
      
      // Process event elements found with our combined selector
      eventElements.forEach(element => {
        try {
          // Find the title element using various common patterns
          const titleElement = 
            element.querySelector('h2, h3, h4, h5, .title, .card-title, .event-title') || 
            element.querySelector('.event-name, .card-header, .heading, [class*="title"]');
          
          // If no dedicated title element, check if the element itself has a short text that could be a title
          if (!titleElement && element.children.length < 3 && element.textContent.trim().length < 50) {
            // The element itself might be a title or contain direct text that is the title
            const directText = Array.from(element.childNodes)
              .filter(node => node.nodeType === Node.TEXT_NODE)
              .map(node => node.textContent.trim())
              .filter(text => text.length > 0)
              .join(' ');
              
            if (directText && directText.length > 3 && directText.length < 100) {
              // Create a temporary object to use as a titleElement
              const tempTitleElement = { textContent: directText };
              results.push(extractEventFromElement(element, tempTitleElement));
              return;
            }
          }
          
          if (!titleElement) return;
          
          const title = titleElement.textContent.trim();
          
          // Skip navigation elements, empty titles, short titles
          if (!title || 
              title.length < 5 || 
              title.length > 100 || 
              processedTitles.has(title) || 
              navigationWords.some(word => title.toLowerCase() === word) ||
              title.toLowerCase() === 'events' || 
              title.toLowerCase() === 'upcoming events') {
            return;
          }
          
          // Mark as processed
          processedTitles.add(title);
          
          function extractEventFromElement(element, titleElem) {
            // Get the title
            const title = titleElem.textContent.trim();
            
            // Get the event URL
            let eventUrl = '';
            // Try to find a link in the title element first
            let linkElement = titleElem.tagName === 'A' ? titleElem : titleElem.querySelector('a');
            // If no link in title, look for links in the parent element
            if (!linkElement || !linkElement.href) {
              linkElement = element.querySelector('a[href*="event"]') || element.querySelector('a');
            }
            if (linkElement && linkElement.href) {
              eventUrl = linkElement.href;
            }
            
            // Get the date using multiple strategies
            let dateText = '';
            
            // Strategy 1: Look for dedicated date elements
            const dateSelectors = [
              '.date', '[datetime]', 'time', '.card-date', '.event-date',
              '.field--name-field-date', '.datetime', '.calendar-date'
            ];
            for (const selector of dateSelectors) {
              const dateElement = element.querySelector(selector);
              if (dateElement && dateElement.textContent.trim()) {
                dateText = dateElement.textContent.trim();
                break;
              }
            }
            
            // Strategy 2: Look for dates in text content using regex
            if (!dateText) {
              const fullText = element.textContent;
              
              // Match month + day pattern
              const monthDayPattern = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?\b/gi;
              const monthDayMatches = fullText.match(monthDayPattern);
              
              if (monthDayMatches && monthDayMatches.length > 0) {
                dateText = monthDayMatches[0];
              }
              
              // If still no date, try more date formats
              if (!dateText) {
                // Try numeric date formats (MM/DD/YYYY or DD/MM/YYYY)
                const numericDatePattern = /\b\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}\b/g;
                const numericMatches = fullText.match(numericDatePattern);
                
                if (numericMatches && numericMatches.length > 0) {
                  dateText = numericMatches[0];
                }
              }
            }
            
            // Get an image if available
            let image = '';
            const imgElement = element.querySelector('img');
            if (imgElement && imgElement.src) {
              image = imgElement.src;
            }
            
            // Get a description
            let description = `${title} at Canada Place`;
            const descriptionSelectors = [
              '.description', '.summary', '.excerpt', '.field--name-body',
              '.event-description', '.card-text', '.teaser', 'p'
            ];
            
            for (const selector of descriptionSelectors) {
              const descElement = element.querySelector(selector);
              if (descElement && descElement.textContent.trim()) {
                const descText = descElement.textContent.trim();
                // Make sure it's not just the title repeated
                if (descText !== title && descText.length > 10) {
                  description = descText;
                  break;
                }
              }
            }
            
            return {
              title,
              dateText: dateText || 'Date TBA',
              description,
              image,
              link: eventUrl,
              venue: venueInfo
            };
          }
          
          // Use the extraction function
          const eventData = extractEventFromElement(element, titleElement);
          
          // Add to results if not already processed
          if (!processedTitles.has(eventData.title)) {
            processedTitles.add(eventData.title);
            results.push(eventData);
            console.log(`Found event: ${eventData.title} - ${eventData.dateText}`);
          }
        } catch (error) {
          console.log(`Error processing event element: ${error.message}`);
        }
      });
      
      // STRATEGY 2: Look for specific event links
      // This helps catch events that might not be in a typical card layout
      const eventLinks = document.querySelectorAll('a[href*="events/"], a[href*="event/"]');
      console.log(`Found ${eventLinks.length} potential direct event links`);
      
      // Process each direct event link
      eventLinks.forEach(link => {
        try {
          // Get the link text as potential title
          const linkText = link.textContent.trim();
          
          // Skip if too short, navigation link, or already processed
          if (!linkText || 
              linkText.length < 5 || 
              linkText.length > 100 || 
              processedTitles.has(linkText) ||
              navigationWords.some(word => linkText.toLowerCase().includes(word))) {
            return;
          }
          
          // Mark this link as processed
          processedTitles.add(linkText);
          
          // Look for date information near the link
          let dateText = '';
          const parent = link.parentElement;
          if (parent) {
            // Look for date in siblings or parent element
            const siblings = Array.from(parent.children);
            for (const sibling of siblings) {
              if (sibling !== link && sibling.textContent.length < 50) {
                // Check if this element contains a date pattern
                const siblingText = sibling.textContent.trim();
                if (/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b|\b\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}\b/i.test(siblingText)) {
                  dateText = siblingText;
                  break;
                }
              }
            }
          }
          
          // If still no date, check if there's a date in the URL
          if (!dateText && link.href) {
            const urlDateMatch = link.href.match(/\d{4}[\/\-]\d{2}[\/\-]\d{2}|\d{2}[\/\-]\d{2}[\/\-]\d{4}/);
            if (urlDateMatch) {
              dateText = urlDateMatch[0].replace(/\//g, '-');
            }
          }
          
          // Create and add the event
          results.push({
            title: linkText,
            dateText: dateText || 'Date TBA',
            description: `${linkText} at Canada Place`,
            image: '',  // Direct links often don't have images
            link: link.href,
            venue: venueInfo
          });
          
          console.log(`Found event from link: ${linkText}`);
        } catch (error) {
          console.log(`Error processing direct event link: ${error.message}`);
        }
      });
      
      // STRATEGY 3: Look for heading elements that might be event titles
      // This catches events that might be in a basic list structure
      const headings = document.querySelectorAll('h2, h3, h4');
      console.log(`Found ${headings.length} potential heading elements`);
      
      headings.forEach(heading => {
        try {
          const title = heading.textContent.trim();
          
          // Skip navigation headings or already processed titles
          if (!title || 
              title.length < 5 || 
              title.length > 100 || 
              processedTitles.has(title) || 
              navigationWords.some(word => title.toLowerCase().includes(word)) ||
              title.toLowerCase().includes('upcoming events') ||
              title.toLowerCase() === 'events') {
            return;
          }
          
          // Check if this heading might be an event title
          // Event titles are often followed by dates or descriptions
          let nextElement = heading.nextElementSibling;
          let dateText = '';
          let description = '';
          let foundEventIndicator = false;
          
          // Look at the next few elements for date info or event indicators
          for (let i = 0; i < 3 && nextElement; i++) {
            const nextText = nextElement.textContent.trim();
            
            // Check if next element contains a date
            if (/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b|\b\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}\b/i.test(nextText)) {
              dateText = nextText;
              foundEventIndicator = true;
              break;
            }
            
            // Check if next element looks like a description
            if (nextText.length > 20 && nextText.length < 1000 && nextElement.tagName === 'P') {
              description = nextText;
              foundEventIndicator = true;
            }
            
            // Check for event-related words
            if (nextText.toLowerCase().includes('register') || 
                nextText.toLowerCase().includes('tickets') || 
                nextText.toLowerCase().includes('join us')) {
              foundEventIndicator = true;
            }
            
            nextElement = nextElement.nextElementSibling;
          }
          
          // Only consider this a potential event if we found some indicators
          if (foundEventIndicator) {
            // Look for a link near this heading
            let eventUrl = '';
            const nearbyLink = heading.querySelector('a') || heading.parentElement.querySelector('a');
            if (nearbyLink && nearbyLink.href) {
              eventUrl = nearbyLink.href;
            }
            
            // Add this potential event
            processedTitles.add(title);
            results.push({
              title,
              dateText: dateText || 'Date TBA',
              description: description || `${title} at Canada Place`,
              image: '',
              link: eventUrl,
              venue: venueInfo
            });
            
            console.log(`Found event from heading: ${title}`);
          }
        } catch (error) {
          console.log(`Error processing heading as event: ${error.message}`);
        }
      });
      
      return results;
    }, this.venue);
    
    console.log(`Extracted ${extractedEvents.length} events from Canada Place using dynamic scraping`);
    
    // Process dates and create final event objects
    return Promise.all(extractedEvents.map(async event => {
      const { startDate, endDate } = this.parseDates(event.dateText);
      
      // Generate a unique ID based on title and date
      const idBase = `${event.title}-${startDate.toISOString().split('T')[0]}-canada-place`;
      const id = slugify(idBase, { lower: true, strict: true });
      
      return {
        id,
        title: event.title,
        description: event.description,
        image: event.image,
        link: event.link,
        venue: this.venue,
        startDate,
        endDate,
        categories: this.determineCategories(event.title),
        lastUpdated: new Date(),
        sourceIdentifier: this.sourceIdentifier
      };
    }));
  }

  /**
   * Parse dates from text
   * @param {string} dateText - Text containing date information
   * @returns {Object} - Object with startDate and endDate
   */
  parseDates(dateText) {
    // Check if date is empty
    if (!dateText || dateText === 'Date TBA') {
      // If no explicit date text, try to infer date from event title if available
      return this.inferDatesFromTitle(dateText);
    }
    
    try {
      // Common date formats: July 15, 2025 or 15 July 2025 or 2025-07-15
      const months = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
        'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'aug': 7, 
        'sep': 8, 'sept': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      
      // Try to extract date components
      let year = new Date().getFullYear();
      let month = null;
      let day = null;
      
      // Check for explicit year in text (4 digit number)
      const yearMatch = dateText.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      }
      
      // Check for month names
      for (const monthName in months) {
        if (dateText.toLowerCase().includes(monthName)) {
          month = months[monthName];
          break;
        }
      }
      
      // Check for day number (1-31)
      const dayMatch = dateText.match(/\b([0-3]?[0-9])(st|nd|rd|th)?\b/);
      if (dayMatch) {
        day = parseInt(dayMatch[1]);
      }
      
      // If we have at least month and day, create a date
      if (month !== null && day !== null) {
        const startDate = new Date(year, month, day);
        const endDate = new Date(year, month, day + 1);  // Assume 1-day events by default
        return { startDate, endDate };
      }
      
      // If we couldn't parse the date, set a future date
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      return { startDate: futureDate, endDate: futureDate };
      
    } catch (error) {
      console.error(`Error parsing date from "${dateText}": ${error.message}`);
      // Default to a future date
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      return { startDate: futureDate, endDate: futureDate };
    }
  }

  /**
   * Extract event details from an individual event page
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Object|null>} - Event object or null if not found
   */
  async extractSingleEventPage(page) {
    try {
      // Get the current URL to use as the event link
      const eventUrl = await page.url();
      console.log(`Extracting event details from: ${eventUrl}`);
      
      // Use evaluate to extract details from the page
      const eventData = await page.evaluate((venueInfo, eventUrl) => {
        // Utility function to extract text content
        const extractText = (element) => {
          if (!element) return '';
          return element.textContent.trim();
        };
        
        // Extract a proper event title from the page
        // First try to get it from the URL if it follows a pattern
        let title = '';
        
        // Try to extract title from URL path
        try {
          const urlPath = new URL(eventUrl).pathname;
          const pathParts = urlPath.split('/');
          // Get last part of URL path and convert to title
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart.length > 3) {
            // Convert slug format to title (e.g. 'christmas-at-canada-place' to 'Christmas at Canada Place')
            title = lastPart
              .replace(/-/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
        } catch (e) {
          // Silent fail and continue with other methods
        }
        
        // If URL parsing didn't work, try the DOM
        if (!title || title.length < 3 || title.length > 100) {
          // Find the event title - typically in a heading element
          const titleSelectors = ['h1', 'h2.page-title', '.event-title', '.title', '[class*="title"]'];
          
          for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const text = extractText(element);
              if (text && text.length > 3 && text.length < 100) {
                title = text;
                break;
              }
            }
          }
        }
        
        // Skip if no valid title found
        if (!title) return null;
        
        // Find the date information
        const dateSelectors = [
          '.event-date', '.date', '[datetime]', 'time',
          '.field--name-field-date', '.datetime', '.calendar-date',
          '[class*="date"]', '[id*="date"]'
        ];
        
        let dateText = '';
        for (const selector of dateSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const text = extractText(element);
            if (text && 
                (/\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december/i.test(text))) {
              dateText = text;
              break;
            }
          }
        }
        
        // Try to find date in page content if no dedicated element
        if (!dateText) {
          const pageText = document.body.textContent;
          const datePatterns = [
            // Full month name patterns
            /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?\b/i,
            // Abbreviated month patterns
            /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?\b/i,
            // Numeric date patterns
            /\b\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}\b/i
          ];
          
          for (const pattern of datePatterns) {
            const match = pageText.match(pattern);
            if (match) {
              dateText = match[0];
              break;
            }
          }
        }
        
        // Find description
        const descriptionSelectors = [
          '.event-description', '.description', '.content', '.field--name-body',
          'article p', '.summary', 'main p', '[class*="description"]', '[class*="content"]'
        ];
        
        let description = '';
        for (const selector of descriptionSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements && elements.length > 0) {
            const paragraphs = Array.from(elements)
              .map(el => extractText(el))
              .filter(text => text && text.length > 20 && text.length < 1000)
              .slice(0, 2); // Take first 2 paragraphs
            
            if (paragraphs.length > 0) {
              description = paragraphs.join(' ');
              break;
            }
          }
        }
        
        // If no description found, use generic one
        if (!description) {
          description = `${title} at Canada Place`;
        }
        
        // Find an image
        let image = '';
        const imgElement = document.querySelector('.event-image img, .field--name-field-image img, article img, main img');
        if (imgElement && imgElement.src) {
          image = imgElement.src;
        }
        
        return {
          title,
          dateText: dateText || 'Date TBA',
          description,
          image,
          link: eventUrl,
          venue: venueInfo
        };
      }, this.venue, eventUrl);
      
      return eventData;
    } catch (error) {
      console.error(`Error extracting from event page: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Determine event categories based on title
   * @param {string} title - Event title
   * @returns {Array} - Array of categories
   */
  determineCategories(title) {
    if (!title) return ['Invalid'];
    
    const lowercaseTitle = title.toLowerCase();
    const categories = ['Entertainment']; // Default category
    
    // Holiday categories
    if (lowercaseTitle.includes('christmas') || lowercaseTitle.includes('holiday')) {
      categories.push('Holiday');
      categories.push('Christmas');
    }
    
    // Canada Day/National categories
    if (lowercaseTitle.includes('canada together') || lowercaseTitle.includes('canada day')) {
      categories.push('National Holiday');
      categories.push('Celebration');
    }
    
    // Port Day
    if (lowercaseTitle.includes('port day')) {
      categories.push('Special Event');
      categories.push('Community');
    }
    
    // Zumba/Fitness
    if (lowercaseTitle.includes('zumba') || lowercaseTitle.includes('fitness') || 
        lowercaseTitle.includes('exercise') || lowercaseTitle.includes('workout')) {
      categories.push('Fitness');
      categories.push('Health & Wellness');
    }
    
    // Sports categories
    if (lowercaseTitle.includes('hockey') || lowercaseTitle.includes('canucks') || 
        lowercaseTitle.includes('game')) {
      categories.push('Sports');
    }
    
    // Music categories
    if (lowercaseTitle.includes('concert') || lowercaseTitle.includes('music') || 
        lowercaseTitle.includes('band') || lowercaseTitle.includes('symphony')) {
      categories.push('Music');
    }
    
    // Festival categories
    if (lowercaseTitle.includes('festival') || lowercaseTitle.includes('fest')) {
      categories.push('Festival');
    }
    
    // Comedy categories
    if (lowercaseTitle.includes('comedy') || lowercaseTitle.includes('laugh')) {
      categories.push('Comedy');
    }
    
    // Theatre categories
    if (lowercaseTitle.includes('theatre') || lowercaseTitle.includes('theater') || 
        lowercaseTitle.includes('play') || lowercaseTitle.includes('musical')) {
      categories.push('Theatre');
    }
    
    return categories;
  }
  
  /**
   * Infer event dates from the title if no explicit date is provided
   * @param {string} title - Event title (optional, if available)
   * @returns {Object} - Object with startDate and endDate
   */
  inferDatesFromTitle(title) {
    // Next month as fallback date
    const nearFutureDate = new Date();
    nearFutureDate.setMonth(nearFutureDate.getMonth() + 1);
    
    // If we have a title, try to determine a more specific date
    if (title) {
      const lowercaseTitle = title.toLowerCase();
      
      // Christmas events
      if (lowercaseTitle.includes('christmas')) {
        // Set to December of current year
        const christmasDate = new Date();
        christmasDate.setMonth(11); // December (0-indexed)
        christmasDate.setDate(25); // Christmas day
        return {
          startDate: christmasDate,
          endDate: christmasDate
        };
      }
      
      // Canada Day events
      if (lowercaseTitle.includes('canada day') || lowercaseTitle.includes('canada together')) {
        // Set to July 1st of current year
        const canadaDayDate = new Date();
        canadaDayDate.setMonth(6); // July (0-indexed)
        canadaDayDate.setDate(1); // 1st day
        return {
          startDate: canadaDayDate,
          endDate: canadaDayDate
        };
      }
      
      // Port Day is typically in early summer
      if (lowercaseTitle.includes('port day')) {
        // Set to June 1st as an approximation
        const portDayDate = new Date();
        portDayDate.setMonth(5); // June (0-indexed)
        portDayDate.setDate(1); // 1st day
        return {
          startDate: portDayDate,
          endDate: portDayDate
        };
      }
      
      // Zumba might be a recurring event, use next week
      if (lowercaseTitle.includes('zumba')) {
        const nextWeekDate = new Date();
        nextWeekDate.setDate(nextWeekDate.getDate() + 7); // 7 days from now
        return {
          startDate: nextWeekDate,
          endDate: nextWeekDate
        };
      }
    }
    
    // Default to next month if we couldn't infer anything more specific
    return {
      startDate: nearFutureDate,
      endDate: nearFutureDate
    };
  }
  
  /**
   * Normalize event title for better deduplication
   * @param {string} title - Event title
   * @returns {string} - Normalized title
   */
  normalizeTitle(title) {
    if (!title) return '';
    
    // Convert to lowercase
    let normalized = title.toLowerCase();
    
    // Remove special characters and extra spaces
    normalized = normalized.replace(/[^a-z0-9 ]/g, ' ');
    
    // Replace multiple spaces with a single space
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Trim any leading/trailing spaces
    normalized = normalized.trim();
    
    // Special case handling for known events with different naming formats
    if (normalized.includes('christmas') && normalized.includes('canada place')) {
      normalized = 'christmas at canada place';
    }
    
    if (normalized.includes('canada') && normalized.includes('together')) {
      normalized = 'canada together';
    }
    
    if (normalized.includes('port') && normalized.includes('day')) {
      normalized = 'port day';
    }
    
    if (normalized.includes('zumba')) {
      normalized = 'zumba at canada place';
    }
    
    return normalized;
  }
}

module.exports = CanadaPlaceEvents;
