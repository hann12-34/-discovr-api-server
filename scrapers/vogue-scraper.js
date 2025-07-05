/**
 * The Vogue Theatre Scraper
 * 
 * This scraper extracts events from The Vogue Theatre website
 * Website: https://www.voguetheatre.com/
 * Events: https://www.voguetheatre.com/events
 */

const puppeteer = require('puppeteer');
const { cleanText, parseDate } = require('./utils/helpers');

/**
 * Sanitize event title for use in URLs and IDs
 * @param {string} title - Event title
 * @returns {string} - URL-safe title
 */
function sanitizeTitle(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

// Venue information
const venue = {
  name: 'The Vogue Theatre',
  address: '918 Granville St',
  city: 'Vancouver',
  province: 'BC',
  postalCode: 'V6Z 1L2',
  coordinates: {
    latitude: 49.2810895,
    longitude: -123.1226946
  },
  country: 'Canada',
  phoneNumber: '(604) 688-1975',
  website: 'https://www.voguetheatre.com',
  websiteUrl: 'https://www.voguetheatre.com',
  capacity: 1250 // The Vogue Theatre capacity
};

// Default categories for The Vogue Theatre events
const defaultCategories = ['entertainment', 'music', 'arts-and-culture'];

/**
 * Generates a unique ID for an event based on the venue, date, and title
 * @param {string} title - The event title
 * @param {Date} date - The event date
 * @returns {string} - A unique event ID
 */
function generateEventId(title, date) {
  const dateStr = date ? date.toISOString().split('T')[0] : 'no-date';
  const sanitized = sanitizeTitle(title);
  const random = Math.random().toString(36).substring(2, 8);
  return `vogue-${dateStr}-${sanitized}-${random}`;
}

/**
 * Parse date string from Vogue Theatre format to Date object
 * @param {string} dateString - Date string from Vogue Theatre
 * @returns {Date} - JavaScript Date object (defaults to future date if invalid)
 */
function parseDateString(dateString) {
  if (!dateString) {
    // Default to a date in the future (1 month from now)
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 1);
    defaultDate.setHours(20, 0, 0, 0); // 8:00 PM
    return defaultDate;
  }
  
  try {
    // Try to extract date patterns
    const monthMatch = dateString.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i);
    const dayMatch = dateString.match(/\b\d{1,2}(?:st|nd|rd|th)?\b/);
    const yearMatch = dateString.match(/\b\d{4}\b/);
    
    if (monthMatch) {
      const month = monthMatch[0];
      const day = dayMatch ? dayMatch[0].replace(/(?:st|nd|rd|th)/g, '') : '1';
      const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
      
      const formattedDate = `${month} ${day}, ${year} 20:00:00`;
      const date = new Date(formattedDate);
      
      // Check if date is valid
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try direct parsing
    const directDate = new Date(dateString);
    if (!isNaN(directDate.getTime())) {
      return directDate;
    }
    
    // Default to a date in the future (1 month from now)
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 1);
    defaultDate.setHours(20, 0, 0, 0); // 8:00 PM
    return defaultDate;
  } catch (error) {
    console.error(`Error parsing date: ${dateString}`, error);
    
    // Default to a date in the future (1 month from now)
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 1);
    defaultDate.setHours(20, 0, 0, 0); // 8:00 PM
    return defaultDate;
  }
}

/**
 * Extract price information from text
 * @param {string} priceText - Text containing price information
 * @returns {string} - Formatted price string
 */
function extractPrice(priceText) {
  if (!priceText) return 'Check website for pricing';
  
  // Try to find price patterns like $XX.XX or $XX
  const priceMatch = priceText.match(/\$\d+(\.\d{2})?/);
  if (priceMatch) {
    return priceMatch[0];
  }
  
  // Check for common price terms
  if (priceText.toLowerCase().includes('free')) {
    return 'Free';
  }
  
  return 'Check website for pricing';
}

/**
 * Scrapes event information from The Vogue Theatre website
 * @returns {Promise<Array>} - Array of event objects
 */
async function scrape() {
  console.log('=== STARTING THE VOGUE THEATRE SCRAPER ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  let browser;
  const events = [];
  const processedUrls = new Set();
  
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the events page
    console.log('Navigating to The Vogue Theatre events page...');
    await page.goto('https://www.voguetheatre.com/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log('Extracting events from The Vogue Theatre...');
    
    // Wait for event elements to load
    await page.waitForSelector('body', { timeout: 30000 });
    
    // Extract events from the page
    const extractedEvents = await page.evaluate((venueInfo) => {
      const eventList = [];
      
      // Look for event cards or list items
      const eventElements = Array.from(document.querySelectorAll('.event-card, .event-item, .event-listing, article, .event'));
      
      if (eventElements.length === 0) {
        // If no specific event elements found, look for generic containers that might hold events
        console.log('No specific event elements found, trying alternate selectors');
        const alternativeElements = Array.from(document.querySelectorAll('div[class*="event"], div[id*="event"], section, article'));
        eventElements.push(...alternativeElements);
      }
      
      console.log(`Found ${eventElements.length} potential event elements`);
      
      eventElements.forEach(element => {
        try {
          // Try to extract event details from each element
          // Title - look for headings first, then any element with a title attribute
          let title = element.querySelector('h1, h2, h3, h4, h5')?.innerText.trim();
          if (!title) {
            title = element.querySelector('[class*="title"]')?.innerText.trim();
          }
          if (!title) {
            title = element.getAttribute('title') || '';
          }
          
          if (!title) return; // Skip if no title found
          
          // Date - look for date elements or time elements
          let dateText = '';
          const dateElement = element.querySelector('[class*="date"], [datetime], time, [class*="time"]');
          if (dateElement) {
            dateText = dateElement.getAttribute('datetime') || dateElement.innerText;
          } else {
            // Try to find date in text content
            const text = element.innerText;
            const dateMatch = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/);
            if (dateMatch) {
              dateText = dateMatch[0];
            }
          }
          
          // Link to event details
          let link = '';
          const linkElement = element.querySelector('a');
          if (linkElement) {
            link = linkElement.href;
          }
          
          // Image
          let imageUrl = '';
          const imageElement = element.querySelector('img');
          if (imageElement) {
            imageUrl = imageElement.src || imageElement.getAttribute('data-src') || '';
          }
          
          // Description/Content
          let description = '';
          const descElement = element.querySelector('[class*="desc"], [class*="content"], p');
          if (descElement) {
            description = descElement.innerText.trim();
          }
          
          // Price
          let price = 'Check website for pricing';
          const priceElement = element.querySelector('[class*="price"], [class*="ticket"]');
          if (priceElement) {
            price = priceElement.innerText.trim();
          }
          
          // Only add events with at least a title
          if (title) {
            eventList.push({
              title,
              dateText,
              link,
              imageUrl,
              description,
              price
            });
          }
        } catch (error) {
          console.error(`Error parsing event element: ${error.message}`);
        }
      });
      
      return eventList;
    }, venue);
    
    console.log(`Found ${extractedEvents.length} events on the page`);
    
    // Process extracted events
    for (const item of extractedEvents) {
      // Skip invalid events
      if (!item.title) {
        continue;
      }
      
      // Parse date string to Date object
      const startDate = parseDateString(item.dateText);
      
      // Generate end date (usually +3 hours after start)
      let endDate = null;
      if (startDate) {
        endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
      }
      
      // Create event object
      const event = {
        id: generateEventId(item.title, startDate),
        title: item.title,
        description: item.description || `${item.title} at The Vogue Theatre`,
        startDate,
        endDate,
        venue,
        price: extractPrice(item.price),
        category: 'entertainment',
        categories: [...defaultCategories],
        sourceURL: 'https://www.voguetheatre.com/events',
        ticketURL: item.link || 'https://www.voguetheatre.com/events',
        image: item.imageUrl || null,
        location: venue.name,
        lastUpdated: new Date()
      };
      
      // Add event to the list
      events.push(event);
      
      // If we have a link to the event page, try to get more details
      if (item.link && !item.description) {
        try {
          const eventPage = await browser.newPage();
          await eventPage.goto(item.link, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });
          
          const eventDetails = await eventPage.evaluate(() => {
            // Look for description
            const descElement = document.querySelector('[class*="desc"], [class*="content"], .event-details, article p');
            const description = descElement ? descElement.innerText.trim() : '';
            
            // Look for better date info
            const dateElement = document.querySelector('[class*="date"], time');
            const dateText = dateElement ? dateElement.innerText.trim() : '';
            
            // Look for ticket link
            const ticketElement = document.querySelector('[class*="ticket"] a, [class*="buy"] a, a[href*="ticket"]');
            const ticketLink = ticketElement ? ticketElement.href : '';
            
            // Look for better image
            const imageElement = document.querySelector('.event-image img, article img, [class*="feature"] img');
            const imageUrl = imageElement ? imageElement.src : '';
            
            return {
              description,
              dateText,
              ticketLink,
              imageUrl
            };
          });
          
          // Update event with better details if available
          if (eventDetails.description) {
            event.description = eventDetails.description;
          }
          
          if (eventDetails.ticketLink) {
            event.ticketURL = eventDetails.ticketLink;
          }
          
          if (eventDetails.imageUrl) {
            event.image = eventDetails.imageUrl;
          }
          
          await eventPage.close();
        } catch (error) {
          console.error(`Error fetching event details from ${item.link}: ${error.message}`);
        }
      }
    }
    
    // If no events were found, try a different scraping approach
    if (events.length === 0) {
      console.log('No events found with the primary approach. Trying backup method...');
      
      // Try to extract any data that might look like events
      const backupEvents = await page.evaluate((venueInfo) => {
        const eventList = [];
        
        // Look for any links that might point to event pages
        const links = Array.from(document.querySelectorAll('a')).filter(link => {
          const href = link.href || '';
          const text = link.innerText || '';
          return (href.includes('event') || 
                 href.includes('show') || 
                 href.includes('concert') ||
                 text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/));
        });
        
        links.forEach(link => {
          const title = link.innerText.trim();
          
          // Skip navigation or other non-event links
          if (title.toLowerCase().includes('home') || 
              title.toLowerCase().includes('about') ||
              title.toLowerCase().includes('contact') ||
              title.length < 3) {
            return;
          }
          
          // Extract date if present in text
          let dateText = '';
          const text = link.innerText;
          const dateMatch = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}?\b/);
          if (dateMatch) {
            dateText = dateMatch[0];
          }
          
          // Find parent element to look for more details
          const parent = link.parentElement;
          let description = '';
          let imageUrl = '';
          
          if (parent) {
            // Look for nearest paragraph for description
            const descElement = parent.querySelector('p');
            if (descElement) {
              description = descElement.innerText.trim();
            }
            
            // Look for image
            const imageElement = parent.querySelector('img');
            if (imageElement) {
              imageUrl = imageElement.src || imageElement.getAttribute('data-src') || '';
            }
          }
          
          eventList.push({
            title,
            dateText,
            link: link.href,
            imageUrl,
            description
          });
        });
        
        return eventList;
      }, venue);
      
      console.log(`Found ${backupEvents.length} potential events with backup method`);
      
      // Process backup events
      for (const item of backupEvents) {
        // Skip invalid or already processed events
        if (!item.title || processedUrls.has(item.link)) {
          continue;
        }
        
        processedUrls.add(item.link);
        
        // Parse date (might be null if not found)
        const startDate = parseDateString(item.dateText);
        
        // Generate end date (usually +3 hours after start)
        let endDate = null;
        if (startDate) {
          endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
        }
        
        // Create event object
        const event = {
          id: generateEventId(item.title, startDate),
          title: item.title,
          description: item.description || `${item.title} at The Vogue Theatre`,
          startDate,
          endDate,
          venue,
          price: 'Check website for pricing',
          category: 'entertainment',
          categories: [...defaultCategories],
          sourceURL: 'https://www.voguetheatre.com/events',
          ticketURL: item.link || 'https://www.voguetheatre.com/events',
          image: item.imageUrl || null,
          location: venue.name,
          lastUpdated: new Date()
        };
        
        events.push(event);
      }
    }
    
  } catch (error) {
    console.error(`Error in The Vogue Theatre scraper: ${error.message}`);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
  
  // Output summary
  if (events.length === 0) {
    console.log('No events found from The Vogue Theatre website.');
  } else {
    console.log('=== THE VOGUE THEATRE SCRAPER RESULTS ===');
    console.log(`Found ${events.length} events`);
    console.log('First event details:');
    if (events.length > 0) {
      console.log(`- Title: ${events[0].title}`);
      console.log(`- ID: ${events[0].id}`);
      console.log(`- Date: ${events[0].startDate || 'No date'}`);
      console.log(`- Venue: ${events[0].venue.name}`);
      console.log(`- SourceURL: ${events[0].sourceURL}`);
      
      if (events.length > 1) {
        console.log(`And ${events.length - 1} more events...`);
      }
    }
    console.log('=== THE VOGUE THEATRE SCRAPER FINISHED ===');
  }
  
  return events;
}

module.exports = {
  sourceIdentifier: 'vogue-theatre',
  scrape
};
