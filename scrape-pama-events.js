/**
 * Peel Art Gallery, Museum and Archives (PAMA) Events Scraper
 * Based on events from https://pama.peelregion.ca/whats-on
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const PAMA_URL = 'https://pama.peelregion.ca/whats-on';
const PAMA_VENUE = {
  name: 'Peel Art Gallery, Museum and Archives (PAMA)',
  address: '9 Wellington St E, Brampton, ON L6W 1Y1',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'L6W 1Y1',
  url: 'https://pama.peelregion.ca',
};

// MongoDB connection URI
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

/**
 * Generate a unique event ID based on event details
 */
function generateEventId(title, startDate) {
  const dataToHash = `${PAMA_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(dataToHash).digest('hex');
}

/**
 * Parse date and time information from text
 */
function parseDateAndTime(dateText) {
  if (!dateText) return null;
  
  try {
    // Common date formats used on the PAMA website
    // Examples: "July 20, 2025", "July 20 - August 15, 2025"
    
    // Clean up the text
    const cleanedText = dateText.replace(/\\n/g, ' ').trim();
    
    // Check if it's a date range
    if (cleanedText.includes(' - ')) {
      // Handle date range format
      const [startDateStr, endDateStr] = cleanedText.split(' - ');
      
      // For ranges like "July 20 - August 15, 2025" where year is only mentioned once
      if (!startDateStr.includes(',') && endDateStr.includes(',')) {
        const year = endDateStr.split(',')[1].trim();
        const fullStartDateStr = `${startDateStr}, ${year}`;
        
        const startDate = new Date(fullStartDateStr);
        const endDate = new Date(endDateStr);
        
        // Add time information - default to all-day events
        startDate.setHours(10, 0, 0, 0); // 10:00 AM
        endDate.setHours(17, 0, 0, 0);  // 5:00 PM
        
        return { startDate, endDate };
      } else {
        // Normal date range
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        
        // Add time information - default to all-day events
        startDate.setHours(10, 0, 0, 0); // 10:00 AM
        endDate.setHours(17, 0, 0, 0);  // 5:00 PM
        
        return { startDate, endDate };
      }
    } else {
      // Single date
      const date = new Date(cleanedText);
      
      // For single day events, set start and end times
      const startDate = new Date(date);
      const endDate = new Date(date);
      
      startDate.setHours(10, 0, 0, 0); // 10:00 AM
      endDate.setHours(17, 0, 0, 0);  // 5:00 PM
      
      return { startDate, endDate };
    }
  } catch (error) {
    console.error(`❌ Error parsing date: ${dateText}`, error);
    // If date parsing fails, return a fallback date (current date + 7 days)
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 7);
    
    return {
      startDate: now,
      endDate: futureDate
    };
  }
}

/**
 * Extract categories from event title and description
 */
function extractCategories(title, description) {
  const categories = ['Toronto', 'Arts', 'Culture'];
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  if (lowerTitle.includes('exhibit') || lowerDesc.includes('exhibit')) {
    categories.push('Exhibition');
  }
  
  if (lowerTitle.includes('workshop') || lowerDesc.includes('workshop')) {
    categories.push('Workshop');
  }
  
  if (lowerTitle.includes('tour') || lowerDesc.includes('tour')) {
    categories.push('Tour');
  }
  
  if (lowerTitle.includes('family') || lowerDesc.includes('family') || 
      lowerTitle.includes('kid') || lowerDesc.includes('kid')) {
    categories.push('Family');
  }
  
  if (lowerTitle.includes('art') || lowerDesc.includes('art')) {
    categories.push('Art');
  }
  
  if (lowerTitle.includes('history') || lowerDesc.includes('history')) {
    categories.push('History');
  }
  
  return [...new Set(categories)]; // Remove duplicates
}

/**
 * Extract price information from text
 */
function extractPrice(description) {
  if (!description) return 'See website for details';
  
  const lowerDesc = description.toLowerCase();
  
  // Check for free events
  if (lowerDesc.includes('free ') || lowerDesc.includes(' free') || 
      lowerDesc.includes('no charge') || lowerDesc.includes('complimentary')) {
    return 'Free';
  }
  
  // Look for price patterns
  const priceMatches = description.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  return 'See website for details';
}

/**
 * Main function to scrape PAMA events
 */
async function scrapePamaEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from PAMA website...');
    
    // Fetch HTML content from PAMA website
    const response = await axios.get(PAMA_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event containers on the page - adjust selectors based on actual website structure
    $('.event-item, .card, .event-card, .whats-on-item').each((i, el) => {
      try {
        const element = $(el);
        
        // Extract event details - adjust selectors based on actual structure
        const title = element.find('h2, h3, .title, .event-title').text().trim();
        const dateText = element.find('.date, .event-date, time').text().trim();
        const description = element.find('p, .description, .event-description').text().trim() || 
                           'Visit PAMA website for more details about this event.';
        
        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/') 
              ? `https://pama.peelregion.ca${imageUrl}` 
              : `https://pama.peelregion.ca/${imageUrl}`;
          }
        }
        
        // Extract URL if available
        let eventUrl = '';
        const linkElement = element.find('a');
        if (linkElement.length > 0) {
          eventUrl = linkElement.attr('href') || '';
          // Make URL absolute if relative
          if (eventUrl && !eventUrl.startsWith('http')) {
            eventUrl = eventUrl.startsWith('/') 
              ? `https://pama.peelregion.ca${eventUrl}` 
              : `https://pama.peelregion.ca/${eventUrl}`;
          }
        }
        
        // Skip events without title or date
        if (!title) return;
        
        // Create event object
        events.push({
          title,
          dateText,
          description,
          imageUrl,
          eventUrl: eventUrl || PAMA_URL
        });
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on PAMA website`);
    
    // If no events found, try alternative selectors
    if (events.length === 0) {
      // Try other common selectors
      $('.events-list .event, .listing-item, article, .program-item').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title').text().trim();
          const dateText = element.find('.date, time, .event-date').text().trim();
          const description = element.find('p, .description').text().trim() || 
                             'Visit PAMA website for more details about this event.';
          
          // Extract image if available
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            // Make URL absolute if relative
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/') 
                ? `https://pama.peelregion.ca${imageUrl}` 
                : `https://pama.peelregion.ca/${imageUrl}`;
            }
          }
          
          // Extract URL if available
          let eventUrl = '';
          const linkElement = element.find('a');
          if (linkElement.length > 0) {
            eventUrl = linkElement.attr('href') || '';
            // Make URL absolute if relative
            if (eventUrl && !eventUrl.startsWith('http')) {
              eventUrl = eventUrl.startsWith('/') 
                ? `https://pama.peelregion.ca${eventUrl}` 
                : `https://pama.peelregion.ca/${eventUrl}`;
            }
          }
          
          // Skip events without title
          if (!title) return;
          
          // Create event object
          events.push({
            title,
            dateText,
            description,
            imageUrl,
            eventUrl: eventUrl || PAMA_URL
          });
        } catch (eventError) {
          console.error('❌ Error extracting event details with alternative selectors:', eventError);
        }
      });
      
      console.log(`🔍 Found ${events.length} events with alternative selectors`);
    }
    
    // Process each event
    for (const event of events) {
      try {
        // Parse date information
        const dateInfo = event.dateText ? parseDateAndTime(event.dateText) : null;
        
        // Skip events with missing critical data
        if (!dateInfo) {
          console.log(`⏭️ Skipping event with missing date: ${event.title}`);
          continue;
        }
        
        // Generate unique ID
        const eventId = generateEventId(event.title, dateInfo.startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: eventId,
          title: `Toronto - ${event.title}`,
          description: event.description,
          categories: extractCategories(event.title, event.description),
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: PAMA_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || PAMA_URL,
          price: extractPrice(event.description),
          location: 'Toronto, Ontario',
          sourceURL: PAMA_URL,
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
      } catch (eventError) {
        console.error(`❌ Error processing event:`, eventError);
      }
    }
    
    // Log warning if no events were found or added
    if (events.length === 0) {
      console.warn('⚠️ Warning: No events found on PAMA website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new PAMA events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping PAMA events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapePamaEvents()
  .then(addedEvents => {
    console.log(`✅ PAMA scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running PAMA scraper:', error);
    process.exit(1);
  });
