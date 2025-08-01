/**
 * Native Earth Events Scraper
 * 
 * This script extracts events from the Native Earth Performing Arts website
 * and adds them to the MongoDB database in the appropriate format.
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Base URL and events page URL
const BASE_URL = 'https://www.nativeearth.ca';
const EVENTS_URL = 'https://www.nativeearth.ca/events/';

// Helper function for delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Venue information for Native Earth
const NATIVE_EARTH_VENUE = {
  name: 'Native Earth Performing Arts',
  address: 'Aki Studio, Daniels Spectrum, 585 Dundas St East, Toronto, ON M5A 2B7',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  postalCode: 'M5A 2B7',
  coordinates: {
    latitude: 43.6591,
    longitude: -79.3602
  }
};

// Categories for Native Earth events
const PERFORMANCE_CATEGORIES = ['arts', 'theatre', 'performance', 'indigenous', 'toronto', 'culture', 'performing arts'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `nativeearth-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...PERFORMANCE_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('dance') || textToSearch.includes('dancing')) categories.push('dance');
  if (textToSearch.includes('music') || textToSearch.includes('concert')) categories.push('music');
  if (textToSearch.includes('storytelling') || textToSearch.includes('story')) categories.push('storytelling');
  if (textToSearch.includes('workshop')) categories.push('workshop');
  if (textToSearch.includes('festival')) categories.push('festival');
  if (textToSearch.includes('reading') || textToSearch.includes('talk')) categories.push('reading');
  if (textToSearch.includes('family') || textToSearch.includes('kid') || textToSearch.includes('children')) categories.push('family');
  if (textToSearch.includes('premiere') || textToSearch.includes('debut')) categories.push('premiere');
  if (textToSearch.includes('comedy')) categories.push('comedy');
  if (textToSearch.includes('drama')) categories.push('drama');
  
  // Remove duplicates
  return [...new Set(categories)];
}

// Function to parse date text into JavaScript Date objects
function parseDateText(dateText) {
  if (!dateText) {
    const now = new Date();
    return { startDate: now, endDate: now };
  }
  
  try {
    // Clean the dateText
    dateText = dateText.trim().replace(/\s+/g, ' ');
    
    // Look for date patterns
    
    // Pattern for ranges with explicit times: "January 15 - March 20, 2025 | 8:00pm"
    const rangeWithTimePattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–]\s*)(?:([A-Za-z]+)\s+)?(\d{1,2})(?:,?\s*(\d{4}))?(?:\s*[|@]\s*(\d{1,2})(?::(\d{2}))?\s*([ap]m))?/i;
    const rangeWithTimeMatch = dateText.match(rangeWithTimePattern);
    
    if (rangeWithTimeMatch) {
      const startMonth = rangeWithTimeMatch[1];
      const startDay = parseInt(rangeWithTimeMatch[2]);
      const endMonth = rangeWithTimeMatch[3] || startMonth;
      const endDay = parseInt(rangeWithTimeMatch[4]);
      const year = rangeWithTimeMatch[5] || new Date().getFullYear().toString();
      
      let hour = 19; // Default to 7pm for theatre events
      let minute = 0;
      
      if (rangeWithTimeMatch[6]) {
        hour = parseInt(rangeWithTimeMatch[6]);
        if (rangeWithTimeMatch[8] && rangeWithTimeMatch[8].toLowerCase() === 'pm' && hour < 12) {
          hour += 12;
        }
        minute = rangeWithTimeMatch[7] ? parseInt(rangeWithTimeMatch[7]) : 0;
      }
      
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      startDate.setHours(hour, minute, 0);
      
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      // For theatre, typically shows are 2-3 hours
      endDate.setHours(hour + 2, minute, 0);
      
      return { startDate, endDate };
    }
    
    // Pattern for single date with time: "January 15, 2025 | 8:00pm"
    const singleDateWithTimePattern = /([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?(?:\s*[|@]\s*(\d{1,2})(?::(\d{2}))?\s*([ap]m))?/i;
    const singleDateWithTimeMatch = dateText.match(singleDateWithTimePattern);
    
    if (singleDateWithTimeMatch) {
      const month = singleDateWithTimeMatch[1];
      const day = parseInt(singleDateWithTimeMatch[2]);
      const year = singleDateWithTimeMatch[3] || new Date().getFullYear().toString();
      
      let hour = 19; // Default to 7pm for theatre events
      let minute = 0;
      
      if (singleDateWithTimeMatch[4]) {
        hour = parseInt(singleDateWithTimeMatch[4]);
        if (singleDateWithTimeMatch[6] && singleDateWithTimeMatch[6].toLowerCase() === 'pm' && hour < 12) {
          hour += 12;
        }
        minute = singleDateWithTimeMatch[5] ? parseInt(singleDateWithTimeMatch[5]) : 0;
      }
      
      const startDate = new Date(`${month} ${day}, ${year}`);
      startDate.setHours(hour, minute, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(hour + 2, minute, 0); // Typical performance duration
      
      return { startDate, endDate };
    }
    
    // Pattern just for time: "8:00pm"
    const timePattern = /(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i;
    const timeMatch = dateText.match(timePattern);
    
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      if (timeMatch[3].toLowerCase() === 'pm' && hour < 12) {
        hour += 12;
      }
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      
      // Use current date with the specified time
      const now = new Date();
      const startDate = new Date(now);
      startDate.setHours(hour, minute, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(hour + 2, minute, 0); // Typical performance duration
      
      return { startDate, endDate };
    }
    
    // Last resort: try direct parsing
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      const startDate = parsedDate;
      
      // Default to evening performance time if no time specified
      if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
        startDate.setHours(19, 30, 0); // 7:30pm is common theatre start time
      }
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 2, startDate.getMinutes(), 0);
      
      return { startDate, endDate };
    }
  } catch (error) {
    console.error(`❌ Failed to parse date: ${dateText}`, error);
  }
  
  // Default to current date if parsing fails
  const now = new Date();
  now.setHours(19, 30, 0); // Default to evening performance
  const endDate = new Date(now);
  endDate.setHours(21, 30, 0);
  return { startDate: now, endDate };
}

// Function to extract price information from text
function extractPrice(text) {
  if (!text) return 'See website for details';
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('free')) return 'Free';
  
  // Look for price patterns like $10, $10-$20, or PWYC (pay what you can)
  const priceMatch = lowerText.match(/\$(\d+(?:\.\d{2})?)(?:\s*-\s*\$(\d+(?:\.\d{2})?))?/);
  if (priceMatch) {
    if (priceMatch[2]) {
      return `$${priceMatch[1]}-$${priceMatch[2]}`;
    } else {
      return `$${priceMatch[1]}`;
    }
  }
  
  // Check for Pay What You Can
  if (lowerText.includes('pay what you can') || lowerText.includes('pwyc')) {
    return 'PWYC (Pay What You Can)';
  }
  
  // Check for ticket mentions
  if (lowerText.includes('ticket')) {
    return 'Ticketed event';
  }
  
  return 'See website for details';
}

// Main function to scrape Native Earth events
async function scrapeNativeEarthEvents() {
  let browser;
  let addedEvents = 0;
  
  try {
    console.log('🔍 Starting Native Earth events scraper...');
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Launch puppeteer
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    // Navigate to the events page
    console.log(`🔍 Navigating to ${EVENTS_URL}...`);
    try {
      await page.goto(EVENTS_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (error) {
      console.log(`⚠️ Initial navigation error: ${error.message}`);
      console.log('🔍 Trying with BASE_URL...');
      await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Look for events link and click it
      const eventsLinkSelector = 'a[href*="events"], a:contains("Events"), a:contains("What\'s On")';
      await page.waitForSelector(eventsLinkSelector);
      await page.click(eventsLinkSelector);
      await delay(3000); // Give time for navigation
    }
    
    // Wait for content to load
    await delay(3000);
    
    // Extract events
    console.log('🔍 Extracting events...');
    const events = await page.evaluate((baseUrl) => {
      const extractedEvents = [];
      
      // Filter function to exclude navigation and UI elements
      const isNavigationOrUI = (text) => {
        if (!text) return true;
        const lowerText = text.toLowerCase();
        return [
          'navigation', 'search', 'menu', 'view', 'filter', 'upcoming', 'past', 
          'calendar', 'list', 'grid', 'login', 'register', 'sign', 'account', 'month', 'day'
        ].some(term => lowerText.includes(term));
      };
      
      // Method 1: Look for event containers/cards
      const eventCards = Array.from(document.querySelectorAll('.tribe-events-calendar-list__event, .tribe-common-g-row, .tribe-events-calendar-month__calendar-event, .type-tribe_events, [class*="event-"], .event-item, article.event'));
      
      if (eventCards.length > 0) {
        eventCards.forEach(card => {
          let title = '';
          let dateText = '';
          let description = '';
          let imageUrl = '';
          let eventUrl = '';
          let price = '';
          
          // Extract title
          const titleEl = card.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="name"]');
          if (titleEl) title = titleEl.textContent.trim();
          
          // Skip if title appears to be a navigation element
          if (isNavigationOrUI(title)) return;
          
          // Extract date
          const dateEl = card.querySelector('.tribe-event-date-start, .tribe-event-date, .tribe-event-time, .date, [class*="date"], time, [class*="time"], [class*="when"]');
          if (dateEl) dateText = dateEl.textContent.trim();
          
          // Extract description
          const descEl = card.querySelector('.description, [class*="description"], .tribe-events-calendar-list__event-description, .summary, [class*="summary"], p:not([class*="navigation"])');
          if (descEl) description = descEl.textContent.trim();
          
          // Extract image
          const imgEl = card.querySelector('img');
          if (imgEl && imgEl.src) imageUrl = imgEl.src;
          
          // Extract link
          const linkEl = card.querySelector('a:not([class*="navigation"])');
          if (linkEl && linkEl.href) {
            eventUrl = linkEl.href;
            // Handle relative URLs
            if (!eventUrl.startsWith('http')) {
              eventUrl = baseUrl + (eventUrl.startsWith('/') ? '' : '/') + eventUrl;
            }
          }
          
          // Extract price
          const priceEl = card.querySelector('.price, [class*="price"], [class*="cost"]');
          if (priceEl) price = priceEl.textContent.trim();
          
          // Only add if we have a meaningful title and it's not a navigation element
          if (title && title.length > 3 && !isNavigationOrUI(title)) {
            extractedEvents.push({ title, dateText, description, imageUrl, eventUrl, price });
          }
        });
      }
      
      // Method 2: Look for structured event lists
      if (extractedEvents.length === 0) {
        // Try to find list items that might be events
        const eventItems = document.querySelectorAll('li, .item');
        
        eventItems.forEach(item => {
          // Check if this item has a title-like element and looks like an event
          const titleEl = item.querySelector('h2, h3, h4, .title, [class*="title"], strong');
          
          if (titleEl) {
            const title = titleEl.textContent.trim();
            
            // Only process if it looks like an event title
            if (title && title.length > 3 && !title.includes('Menu') && !title.includes('Navigation')) {
              let dateText = '';
              let description = '';
              let imageUrl = '';
              let eventUrl = '';
              let price = '';
              
              // Extract date
              const dateEl = item.querySelector('.date, [class*="date"], time, [class*="time"]');
              if (dateEl) dateText = dateEl.textContent.trim();
              
              // Extract description
              const descEl = item.querySelector('.description, [class*="description"], p');
              if (descEl) description = descEl.textContent.trim();
              
              // Extract image
              const imgEl = item.querySelector('img');
              if (imgEl && imgEl.src) imageUrl = imgEl.src;
              
              // Extract link
              const linkEl = item.querySelector('a');
              if (linkEl && linkEl.href) {
                eventUrl = linkEl.href;
                // Handle relative URLs
                if (!eventUrl.startsWith('http')) {
                  eventUrl = baseUrl + (eventUrl.startsWith('/') ? '' : '/') + eventUrl;
                }
              }
              
              // Extract price
              const priceEl = item.querySelector('.price, [class*="price"], [class*="cost"]');
              if (priceEl) price = priceEl.textContent.trim();
              
              extractedEvents.push({ title, dateText, description, imageUrl, eventUrl, price });
            }
          }
        });
      }
      
      // Method 3: Look for calendar entries
      if (extractedEvents.length === 0) {
        const calendarEntries = document.querySelectorAll('.calendar-event, [class*="calendar"], [class*="event-day"]');
        
        calendarEntries.forEach(entry => {
          let title = '';
          let dateText = '';
          let eventUrl = '';
          
          // Extract title
          const titleEl = entry.querySelector('a, .title, [class*="title"]');
          if (titleEl) title = titleEl.textContent.trim();
          
          // Extract date
          const dateEl = entry.querySelector('.date, [class*="date"], time');
          if (dateEl) dateText = dateEl.textContent.trim();
          
          // Extract link
          if (titleEl && titleEl.href) {
            eventUrl = titleEl.href;
            // Handle relative URLs
            if (!eventUrl.startsWith('http')) {
              eventUrl = baseUrl + (eventUrl.startsWith('/') ? '' : '/') + eventUrl;
            }
          }
          
          // Only add if we have at least a title and date
          if (title && dateText) {
            extractedEvents.push({ title, dateText, description: '', imageUrl: '', eventUrl, price: '' });
          }
        });
      }
      
      return extractedEvents;
    }, BASE_URL);
    
    console.log(`🔍 Found ${events.length} potential events`);
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}`);
        
        // If we have an event URL, visit it to get more details
        if (event.eventUrl) {
          console.log(`🔍 Visiting event page: ${event.eventUrl}`);
          
          try {
            await page.goto(event.eventUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await delay(2000);
            
            // Extract additional details
            const additionalDetails = await page.evaluate(() => {
              let fullDescription = '';
              let detailedDate = '';
              let betterImage = '';
              let price = '';
              
              // Get better description
              const descriptionElements = document.querySelectorAll('.description, [class*="description"], .content p, article p');
              let bestDesc = '';
              descriptionElements.forEach(el => {
                const text = el ? el.textContent.trim() : '';
                if (text && text.length > bestDesc.length) {
                  bestDesc = text;
                }
              });
              fullDescription = bestDesc;
              
              // Get better date info
              const dateElements = document.querySelectorAll('.date, [class*="date"], time, [class*="time"], .when, [class*="when"]');
              let bestDate = '';
              dateElements.forEach(el => {
                const text = el ? el.textContent.trim() : '';
                if (text && text.length > bestDate.length) {
                  bestDate = text;
                }
              });
              detailedDate = bestDate;
              
              // Get better image
              const imageElements = document.querySelectorAll('.featured-image img, [class*="featured"] img, .hero img, .banner img');
              if (imageElements.length > 0 && imageElements[0].src) {
                betterImage = imageElements[0].src;
              }
              
              // Get price info
              const priceElements = document.querySelectorAll('.price, [class*="price"], [class*="ticket"], [class*="cost"]');
              let bestPrice = '';
              priceElements.forEach(el => {
                const text = el ? el.textContent.trim() : '';
                if (text && text.includes('$') && text.length > bestPrice.length) {
                  bestPrice = text;
                }
              });
              price = bestPrice;
              
              return {
                fullDescription,
                detailedDate,
                betterImage,
                price
              };
            });
            
            // Update event with better information if available
            if (additionalDetails.fullDescription && additionalDetails.fullDescription.length > 20) {
              event.description = additionalDetails.fullDescription;
            }
            
            if (additionalDetails.detailedDate && additionalDetails.detailedDate.length > 0) {
              event.dateText = additionalDetails.detailedDate;
            }
            
            if (additionalDetails.betterImage) {
              event.imageUrl = additionalDetails.betterImage;
            }
            
            if (additionalDetails.price) {
              event.price = additionalDetails.price;
            }
          } catch (error) {
            console.error(`❌ Error visiting event page: ${error.message}`);
          }
        }
        
        // Parse dates
        const { startDate, endDate } = parseDateText(event.dateText);
        
        // Extract price
        const price = extractPrice(event.price || event.description);
        
        // Generate unique ID
        const id = generateEventId(event.title, startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: id,
          title: `Toronto - ${event.title}`,
          description: event.description || `Event at Native Earth Performing Arts: ${event.title}`,
          categories: extractCategories(event.title, event.description),
          startDate: startDate,
          endDate: endDate,
          venue: NATIVE_EARTH_VENUE,
          imageUrl: event.imageUrl || '',
          officialWebsite: event.eventUrl || EVENTS_URL,
          price: price,
          sourceURL: EVENTS_URL,
          lastUpdated: new Date()
        };
        
        // Check for duplicates
        const existingEvent = await eventsCollection.findOne({
          $or: [
            { id: formattedEvent.id },
            { 
              title: formattedEvent.title,
              startDate: formattedEvent.startDate
            }
          ]
        });
        
        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate event: ${formattedEvent.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing event: ${error.message}`);
      }
    }
    
    // If no events were found or added, log but do not create sample events
    if (addedEvents === 0) {
      console.log('⚠️ No events were found on the Native Earth Performing Arts website.');
    }
    
    // Log the results
    console.log(`📊 Successfully added ${addedEvents} new Native Earth events`);
    
  } catch (error) {
    console.error('❌ Error scraping Native Earth events:', error);
  } finally {
    // Close the browser
    if (browser) {
      await browser.close();
    }
    
    // Close MongoDB connection
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeNativeEarthEvents()
  .then(addedEvents => {
    console.log(`✅ Native Earth scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Native Earth scraper:', error);
    process.exit(1);
  });
