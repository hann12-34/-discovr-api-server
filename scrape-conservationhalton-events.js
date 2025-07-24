/**
 * Conservation Halton Events Scraper
 * Based on events from https://www.conservationhalton.ca/events/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const CONSERVATION_HALTON_URL = 'https://www.conservationhalton.ca/events/';
const CONSERVATION_HALTON_VENUE = {
  name: "Conservation Halton",
  address: '2596 Britannia Rd W, Milton, ON L9T 2X6',
  googleMapsUrl: 'https://goo.gl/maps/8fLaH1s2Ph4pizXz6',
  officialWebsite: 'https://www.conservationhalton.ca/'
};

// MongoDB connection string from environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ Please set the MONGODB_URI environment variable');
  process.exit(1);
}

/**
 * Generate a unique ID for an event based on venue, title and start date
 * @param {string} title - Event title
 * @param {Date} startDate - Event start date
 * @returns {string} - MD5 hash of venue name, title and start date
 */
function generateEventId(title, startDate) {
  const data = `${CONSERVATION_HALTON_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Extract categories from event title and description
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {Array<string>} - Array of categories
 */
function extractCategories(title, description) {
  const categories = [];
  const combinedText = `${title} ${description}`.toLowerCase();
  
  // Define category keywords
  const categoryMapping = {
    'hike': 'Outdoor Activities',
    'walk': 'Outdoor Activities',
    'trail': 'Outdoor Activities',
    'outdoor': 'Outdoor Activities',
    'nature': 'Nature',
    'environment': 'Nature',
    'conservation': 'Nature',
    'bird': 'Wildlife',
    'animal': 'Wildlife',
    'wildlife': 'Wildlife',
    'workshop': 'Educational',
    'learn': 'Educational',
    'education': 'Educational',
    'course': 'Educational',
    'family': 'Family',
    'kid': 'Family',
    'children': 'Family',
    'camp': 'Camp',
    'summer camp': 'Camp',
    'festival': 'Festival',
    'celebration': 'Festival',
    'holiday': 'Seasonal',
    'christmas': 'Seasonal',
    'halloween': 'Seasonal',
    'winter': 'Seasonal',
    'spring': 'Seasonal',
    'fall': 'Seasonal',
    'summer': 'Seasonal'
  };
  
  // Check for category matches
  Object.keys(categoryMapping).forEach(keyword => {
    if (combinedText.includes(keyword)) {
      const category = categoryMapping[keyword];
      if (!categories.includes(category)) {
        categories.push(category);
      }
    }
  });
  
  // Default category if none found
  if (categories.length === 0) {
    categories.push('Nature');
  }
  
  return categories;
}

/**
 * Parse date string to extract start and end dates
 * @param {string} dateString - Date string to parse
 * @returns {Object|null} - Object with startDate and endDate or null if parsing failed
 */
function parseEventDates(dateString) {
  if (!dateString) return null;
  
  try {
    // Clean up the date string
    dateString = dateString.replace(/\s+/g, ' ').trim();
    
    const currentYear = new Date().getFullYear();
    
    // Check for date ranges like "June 1 - August 31" or "June 1 - August 31, 2025"
    const rangeRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const rangeMatch = dateString.match(rangeRegex);
    
    if (rangeMatch) {
      const startMonth = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2], 10);
      const endMonth = rangeMatch[3];
      const endDay = parseInt(rangeMatch[4], 10);
      const year = rangeMatch[5] ? parseInt(rangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      
      // If end date is before start date, it might be in the next year
      if (endDate < startDate) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      
      // Set times (default to all-day event)
      startDate.setHours(9, 0, 0, 0);
      endDate.setHours(17, 0, 0, 0); // Conservation areas often close at 5pm
      
      return { startDate, endDate };
    }
    
    // Check for single dates like "June 1" or "June 1, 2025"
    const singleRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const singleMatch = dateString.match(singleRegex);
    
    if (singleMatch) {
      const month = singleMatch[1];
      const day = parseInt(singleMatch[2], 10);
      const year = singleMatch[3] ? parseInt(singleMatch[3], 10) : currentYear;
      
      const startDate = new Date(`${month} ${day}, ${year}`);
      // For a single date, set end date to the same day
      const endDate = new Date(startDate);
      
      // Set times for start and end (default to all-day event)
      startDate.setHours(9, 0, 0, 0);
      endDate.setHours(17, 0, 0, 0);
      
      return { startDate, endDate };
    }
    
    // Try to extract time as well (e.g., "June 1, 2025 at 2:00pm - 4:00pm")
    const dateTimeRegex = /([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*(?:\d{4})?)(?:.*?)(\d{1,2}:\d{2}\s*[ap]m)(?:\s*[-–]\s*(\d{1,2}:\d{2}\s*[ap]m))?/i;
    const dateTimeMatch = dateString.match(dateTimeRegex);
    
    if (dateTimeMatch) {
      const datePart = dateTimeMatch[1];
      const startTimePart = dateTimeMatch[2];
      const endTimePart = dateTimeMatch[3] || startTimePart;
      
      // Parse the date part
      const dateObj = new Date(datePart);
      if (isNaN(dateObj.getTime())) return null;
      
      // Parse the time parts
      const startTimeParts = startTimePart.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
      const endTimeParts = endTimePart.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
      
      if (startTimeParts && endTimeParts) {
        let startHour = parseInt(startTimeParts[1], 10);
        const startMinute = parseInt(startTimeParts[2], 10);
        const startAmPm = startTimeParts[3].toLowerCase();
        
        let endHour = parseInt(endTimeParts[1], 10);
        const endMinute = parseInt(endTimeParts[2], 10);
        const endAmPm = endTimeParts[3].toLowerCase();
        
        // Convert to 24-hour format
        if (startAmPm === 'pm' && startHour < 12) startHour += 12;
        if (startAmPm === 'am' && startHour === 12) startHour = 0;
        
        if (endAmPm === 'pm' && endHour < 12) endHour += 12;
        if (endAmPm === 'am' && endHour === 12) endHour = 0;
        
        const startDate = new Date(dateObj);
        startDate.setHours(startHour, startMinute, 0, 0);
        
        const endDate = new Date(dateObj);
        endDate.setHours(endHour, endMinute, 0, 0);
        
        return { startDate, endDate };
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error parsing date string:', error);
    return null;
  }
}

/**
 * Extract the price information from text
 * @param {string} priceText - Text containing price information
 * @returns {string} - Formatted price information
 */
function extractPrice(priceText) {
  if (!priceText) return 'See website for details';
  
  const lowerText = priceText.toLowerCase();
  
  if (lowerText.includes('free')) return 'Free';
  
  // Extract dollar amounts
  const priceMatches = priceText.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  return 'See website for details';
}

/**
 * Main function to scrape Conservation Halton events
 */
async function scrapeConservationHaltonEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Conservation Halton website...');
    
    // Fetch HTML content
    const response = await axios.get(CONSERVATION_HALTON_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event cards or containers
    $('.event-item, .event-card, .event-listing, .event').each((i, element) => {
      const eventElement = $(element);
      
      // Extract event title
      const titleElement = eventElement.find('h2, h3, .event-title, .title');
      const title = titleElement.text().trim();
      
      // Extract event URL
      const linkElement = eventElement.find('a');
      const relativeUrl = linkElement.attr('href');
      const eventUrl = relativeUrl ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.conservationhalton.ca${relativeUrl}`) : CONSERVATION_HALTON_URL;
      
      // Extract date information
      const dateElement = eventElement.find('.event-date, .date, [class*="date"]');
      const dateText = dateElement.text().trim();
      
      // Extract description
      const descriptionElement = eventElement.find('.event-description, .description, p');
      const description = descriptionElement.text().trim();
      
      // Extract image URL
      const imageElement = eventElement.find('img');
      const imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
      
      if (title && (dateText || eventUrl !== CONSERVATION_HALTON_URL)) {
        events.push({
          title,
          description,
          dateText,
          imageUrl,
          eventUrl
        });
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Conservation Halton website`);
    
    // If the main event extraction didn't work, try an alternative approach
    if (events.length === 0) {
      console.log('🔍 No events found with primary method, trying alternative approach...');
      
      // Look for elements that might contain event information
      $('article, .card, .post').each((i, element) => {
        const eventElement = $(element);
        
        // Extract event title
        const titleElement = eventElement.find('h2, h3, h4, .title');
        const title = titleElement.text().trim();
        
        // Extract event URL
        const linkElement = eventElement.find('a');
        const relativeUrl = linkElement.attr('href');
        const eventUrl = relativeUrl ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.conservationhalton.ca${relativeUrl}`) : CONSERVATION_HALTON_URL;
        
        // Extract date information
        const dateElement = eventElement.find('.date, time, [class*="date"], [class*="calendar"]');
        const dateText = dateElement.text().trim();
        
        // Extract description
        const descriptionElement = eventElement.find('p, .excerpt, .description, .content');
        const description = descriptionElement.text().trim();
        
        // Extract image URL
        const imageElement = eventElement.find('img');
        const imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
        
        if (title && (dateText || eventUrl !== CONSERVATION_HALTON_URL)) {
          events.push({
            title,
            description,
            dateText,
            imageUrl,
            eventUrl
          });
        }
      });
      
      console.log(`🔍 Found ${events.length} events using alternative approach`);
    }
    
    // Process individual event URLs to get more details
    if (events.length > 0) {
      console.log('🔍 Fetching additional details from individual event pages...');
      
      const eventDetailsPromises = events.map(async (event) => {
        if (event.eventUrl && event.eventUrl !== CONSERVATION_HALTON_URL) {
          try {
            console.log(`🔍 Fetching details for: ${event.title} from ${event.eventUrl}`);
            
            const detailResponse = await axios.get(event.eventUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // If we don't have a date yet, try to extract it from the detail page
            if (!event.dateText) {
              // Try various date selectors
              const dateSelectors = [
                '.event-date', '.date', '[class*="date"]', '.calendar',
                '.event-meta time', '.post-meta time', '.meta-date'
              ];
              
              for (const selector of dateSelectors) {
                const detailDate = detail$(selector).text().trim();
                if (detailDate) {
                  event.dateText = detailDate;
                  console.log(`📅 Found date on detail page: ${detailDate}`);
                  break;
                }
              }
              
              // If still no date, look through the page content
              if (!event.dateText) {
                // Look for date patterns in the text
                const pageText = detail$('body').text();
                const datePatterns = [
                  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(st|nd|rd|th)?([-–]\d{1,2}(st|nd|rd|th)?)?(,\s*\d{4})?/i,
                  /\d{1,2}(st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(,\s*\d{4})?/i
                ];
                
                for (const pattern of datePatterns) {
                  const matches = pageText.match(pattern);
                  if (matches && matches.length > 0) {
                    event.dateText = matches[0];
                    console.log(`📅 Found date in page content: ${event.dateText}`);
                    break;
                  }
                }
              }
            }
            
            // If we don't have a description yet, try to extract it from the detail page
            if (!event.description) {
              const descriptionSelectors = [
                '.event-description', '.description', '.content', '.entry-content',
                'article p', '.post-content p'
              ];
              
              for (const selector of descriptionSelectors) {
                const elements = detail$(selector);
                if (elements.length > 0) {
                  // Get the first few paragraphs
                  let description = '';
                  elements.each((i, el) => {
                    if (i < 3) { // Limit to first 3 paragraphs
                      description += detail$(el).text().trim() + ' ';
                    }
                  });
                  
                  if (description) {
                    event.description = description.trim();
                    break;
                  }
                }
              }
            }
            
            // Extract price information if available
            const priceSelectors = [
              '.price', '.cost', '.fee', '[class*="price"]', '[class*="cost"]',
              '[class*="fee"]', '.event-price', '.ticket-price'
            ];
            
            let priceText = '';
            for (const selector of priceSelectors) {
              const priceElement = detail$(selector);
              if (priceElement.length > 0) {
                priceText = priceElement.text().trim();
                break;
              }
            }
            
            if (priceText) {
              event.price = extractPrice(priceText);
            }
            
            // If we don't have an image URL yet, try to extract it from the detail page
            if (!event.imageUrl) {
              const imageSelectors = [
                '.event-image img', '.featured-image img', 'article img',
                '.post-thumbnail img', '[class*="event"] img'
              ];
              
              for (const selector of imageSelectors) {
                const imageElement = detail$(selector).first();
                if (imageElement.length > 0) {
                  const src = imageElement.attr('src') || imageElement.attr('data-src');
                  if (src) {
                    event.imageUrl = src.startsWith('http') ? src : `https://www.conservationhalton.ca${src}`;
                    break;
                  }
                }
              }
            }
            
          } catch (detailError) {
            console.error(`❌ Error fetching details for event: ${event.title}`, detailError.message);
          }
        }
        return event;
      });
      
      // Wait for all detail requests to complete
      await Promise.all(eventDetailsPromises);
    }
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}, Date: ${event.dateText || 'Unknown'}`);
        
        // If no description was found, use a default one
        if (!event.description) {
          event.description = `Join us for ${event.title} at Conservation Halton. See website for more details.`;
        }
        
        // Parse date information - NO FALLBACKS
        const dateInfo = parseEventDates(event.dateText);
        
        // Skip events with missing or invalid dates
        if (!dateInfo || isNaN(dateInfo.startDate.getTime()) || isNaN(dateInfo.endDate.getTime())) {
          console.log(`⏭️ Skipping event with invalid or missing date: ${event.title}`);
          continue;
        }
        
        // Generate unique ID
        const eventId = generateEventId(event.title, dateInfo.startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: eventId,
          title: event.title,
          description: event.description,
          categories: extractCategories(event.title, event.description),
          date: {
            start: dateInfo.startDate,
            end: dateInfo.endDate
          },
          venue: CONSERVATION_HALTON_VENUE,
          imageUrl: event.imageUrl || '',
          url: event.eventUrl || CONSERVATION_HALTON_URL,
          price: event.price || 'See website for details',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Check for duplicates
        const existingEvent = await eventsCollection.findOne({
          $or: [
            { id: formattedEvent.id },
            { 
              title: formattedEvent.title,
              'date.start': formattedEvent.date.start
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
      } catch (eventError) {
        console.error(`❌ Error processing event:`, eventError.message);
      }
    }
    
    // Log warning if no events were found or added
    if (events.length === 0) {
      console.warn('⚠️ Warning: No events found on Conservation Halton website.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates or missing dates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Conservation Halton events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Conservation Halton events:', error.message);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeConservationHaltonEvents()
  .then(addedEvents => {
    console.log(`✅ Conservation Halton scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Conservation Halton scraper:', error);
    process.exit(1);
  });
