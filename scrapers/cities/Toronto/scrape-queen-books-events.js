/**
 * Queen Books Events Scraper
 * Based on events from https://queenbooks.ca/events/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const QUEEN_BOOKS_URL = 'https://queenbooks.ca/events/';
const QUEEN_BOOKS_VENUE = {
  name: 'Queen Books',
  address: '914 Queen St E, Toronto, ON M4M 1J5',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M4M 1J5',
  url: 'https://queenbooks.ca',
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
  const dataToHash = `${QUEEN_BOOKS_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(dataToHash).digest('hex');
}

/**
 * Parse date and time information from text
 */
function parseDateAndTime(dateText, timeText = '') {
  if (!dateText) return null;
  
  try {
    // Clean up the texts
    dateText = dateText.replace(/\\n/g, ' ').trim();
    timeText = timeText ? timeText.replace(/\\n/g, ' ').trim() : '';
    
    let startDate, endDate;
    
    // Check if it's a date range
    if (dateText.includes(' - ') || dateText.includes(' to ')) {
      // Handle date range format
      const separator = dateText.includes(' - ') ? ' - ' : ' to ';
      const [startDateStr, endDateStr] = dateText.split(separator);
      
      startDate = new Date(startDateStr);
      
      // Handle case where year might be missing in the start date
      if (isNaN(startDate.getTime()) && endDateStr.includes(',')) {
        const year = endDateStr.split(',')[1].trim();
        startDate = new Date(`${startDateStr}, ${year}`);
      }
      
      endDate = new Date(endDateStr);
    } else {
      // Single date
      startDate = new Date(dateText);
      endDate = new Date(dateText);
    }
    
    // Process time information if available
    if (timeText) {
      // Time formats: "7:00 PM", "7 PM", "19:00", "7:00 PM - 9:00 PM"
      // Check if time range is provided
      if (timeText.includes(' - ') || timeText.includes(' to ')) {
        const separator = timeText.includes(' - ') ? ' - ' : ' to ';
        const [startTimeStr, endTimeStr] = timeText.split(separator);
        
        // Parse start time
        const startTimeMatch = startTimeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (startTimeMatch) {
          let hours = parseInt(startTimeMatch[1], 10);
          const minutes = startTimeMatch[2] ? parseInt(startTimeMatch[2], 10) : 0;
          const period = startTimeMatch[3] ? startTimeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
        } else {
          // Default start time for bookstore events
          startDate.setHours(18, 30, 0, 0); // 6:30 PM default
        }
        
        // Parse end time
        const endTimeMatch = endTimeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (endTimeMatch) {
          let hours = parseInt(endTimeMatch[1], 10);
          const minutes = endTimeMatch[2] ? parseInt(endTimeMatch[2], 10) : 0;
          const period = endTimeMatch[3] ? endTimeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          endDate.setHours(hours, minutes, 0, 0);
        } else {
          // Default end time
          endDate.setHours(20, 0, 0, 0); // 8:00 PM default for book events
        }
      } else {
        // Single time, assume event lasts 1.5 hours (typical for book readings)
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // Default event duration is 1.5 hours for book events
          endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + 90); // 1.5 hour duration
        } else {
          // Default times if parsing fails
          startDate.setHours(18, 30, 0, 0); // 6:30 PM default
          endDate.setHours(20, 0, 0, 0);    // 8:00 PM default
        }
      }
    } else {
      // Default times if no time provided
      startDate.setHours(18, 30, 0, 0); // 6:30 PM default for evening book events
      endDate.setHours(20, 0, 0, 0);    // 8:00 PM default
    }
    
    return { startDate, endDate };
  } catch (error) {
    console.error(`❌ Error parsing date/time: ${dateText} ${timeText}`, error);
    return null;
  }
}

/**
 * Extract categories from event title and description
 */
function extractCategories(title, description) {
  const categories = ['Toronto', 'Books', 'Literature'];
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  if (lowerTitle.includes('author') || lowerDesc.includes('author')) {
    categories.push('Author Talk');
  }
  
  if (lowerTitle.includes('reading') || lowerDesc.includes('reading')) {
    categories.push('Book Reading');
  }
  
  if (lowerTitle.includes('signing') || lowerDesc.includes('signing')) {
    categories.push('Book Signing');
  }
  
  if (lowerTitle.includes('launch') || lowerDesc.includes('launch')) {
    categories.push('Book Launch');
  }
  
  if (lowerTitle.includes('workshop') || lowerDesc.includes('workshop')) {
    categories.push('Workshop');
  }
  
  if (lowerTitle.includes('poetry') || lowerDesc.includes('poetry')) {
    categories.push('Poetry');
  }
  
  if (lowerTitle.includes('fiction') || lowerDesc.includes('fiction')) {
    categories.push('Fiction');
  }
  
  if (lowerTitle.includes('non-fiction') || lowerDesc.includes('non-fiction') ||
      lowerTitle.includes('nonfiction') || lowerDesc.includes('nonfiction')) {
    categories.push('Non-Fiction');
  }
  
  if (lowerTitle.includes('kids') || lowerDesc.includes('kids') ||
      lowerTitle.includes('children') || lowerDesc.includes('children')) {
    categories.push('Children');
  }
  
  return [...new Set(categories)]; // Remove duplicates
}

/**
 * Extract price information from text
 */
function extractPrice(text) {
  if (!text) return 'See website for details';
  
  const lowerText = text.toLowerCase();
  
  // Check for free events
  if (lowerText.includes('free') || lowerText.includes('no charge')) {
    return 'Free';
  }
  
  // Look for price patterns
  const priceMatches = text.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  // Check for ticket mentions
  if (lowerText.includes('ticket')) {
    return 'Tickets required. See website for details';
  }
  
  return 'See website for details';
}

/**
 * Main function to scrape Queen Books events
 */
async function scrapeQueenBooksEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Queen Books website...');
    
    // Fetch HTML content from Queen Books website
    const response = await axios.get(QUEEN_BOOKS_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event containers on the page - adjust selectors based on actual website structure
    $('.event, .event-item, article, .entry, .event-listing, .event-card, .event-container').each((i, el) => {
      try {
        const element = $(el);
        
        // Extract event details
        const title = element.find('h2, h3, h4, .title, .event-title').text().trim();
        const dateText = element.find('.date, .event-date, time, [class*="date"]').text().trim();
        const timeText = element.find('.time, .event-time, [class*="time"]').text().trim();
        
        // Extract description
        const description = element.find('p, .description, .event-description, .content, .excerpt').text().trim() || 
                           'Join us for this special event at Queen Books! Visit our website for more details.';
        
        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/') 
              ? `https://queenbooks.ca${imageUrl}` 
              : `https://queenbooks.ca/${imageUrl}`;
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
              ? `https://queenbooks.ca${eventUrl}` 
              : `https://queenbooks.ca/${eventUrl}`;
          }
        }
        
        // Extract price information
        const priceText = element.find('.price, .event-price, [class*="price"]').text().trim();
        
        // Skip events without title
        if (!title) return;
        
        // Create event object
        events.push({
          title,
          dateText,
          timeText,
          description,
          imageUrl,
          eventUrl: eventUrl || QUEEN_BOOKS_URL,
          priceText
        });
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Queen Books website`);
    
    // If no events found with primary selectors, try alternative selectors
    if (events.length === 0) {
      // Try other common selectors for different page layouts
      $('.events-list .item, .post, .card, [class*="event"], .shopify-section .event').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title').text().trim() || 'Queen Books Event';
          const dateText = element.find('.date, time, [class*="date"]').text().trim();
          const timeText = element.find('.time, [class*="time"]').text().trim();
          const description = element.find('p, .description, .excerpt').text().trim() || 
                             'Join us for this special event at Queen Books! Visit our website for more details.';
          
          // Extract image if available
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            // Make URL absolute if relative
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/') 
                ? `https://queenbooks.ca${imageUrl}` 
                : `https://queenbooks.ca/${imageUrl}`;
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
                ? `https://queenbooks.ca${eventUrl}` 
                : `https://queenbooks.ca/${eventUrl}`;
            }
          }
          
          // Extract price information
          const priceText = element.find('.price, [class*="price"]').text().trim();
          
          // Create event object
          events.push({
            title,
            dateText,
            timeText,
            description,
            imageUrl,
            eventUrl: eventUrl || QUEEN_BOOKS_URL,
            priceText
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
        const dateInfo = parseDateAndTime(event.dateText, event.timeText);
        
        // Skip events with missing or invalid dates
        if (!dateInfo || isNaN(dateInfo.startDate.getTime()) || isNaN(dateInfo.endDate.getTime())) {
          console.log(`⏭️ Skipping event with invalid date: ${event.title}`);
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
          venue: QUEEN_BOOKS_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || QUEEN_BOOKS_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'See website for details',
          location: 'Toronto, Ontario',
          sourceURL: QUEEN_BOOKS_URL,
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
      console.warn('⚠️ Warning: No events found on Queen Books website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Queen Books events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Queen Books events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeQueenBooksEvents()
  .then(addedEvents => {
    console.log(`✅ Queen Books scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Queen Books scraper:', error);
    process.exit(1);
  });
