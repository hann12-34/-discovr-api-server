/**
 * Port Credit Events Scraper
 * Based on events from https://portcredit.ca/events/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const PORT_CREDIT_URL = 'https://portcredit.ca/events/';
const PORT_CREDIT_VENUE = {
  name: 'Port Credit',
  address: 'Port Credit, Mississauga, ON',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  url: 'https://portcredit.ca',
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
  const dataToHash = `${PORT_CREDIT_VENUE.name}-${title}-${startDate.toISOString()}`;
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
          // Default start time
          startDate.setHours(10, 0, 0, 0); // 10:00 AM default for community events
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
          endDate.setHours(17, 0, 0, 0); // 5:00 PM default
        }
      } else {
        // Single time, assume event lasts 3 hours (typical for community events)
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // Default event duration is 3 hours for community events
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
        } else {
          // Default times if parsing fails
          startDate.setHours(10, 0, 0, 0); // 10:00 AM default
          endDate.setHours(13, 0, 0, 0);   // 1:00 PM default
        }
      }
    } else {
      // Default times if no time provided
      startDate.setHours(10, 0, 0, 0); // 10:00 AM default
      endDate.setHours(17, 0, 0, 0);   // 5:00 PM default for all-day events
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
  const categories = ['Toronto', 'Mississauga', 'Community'];
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  if (lowerTitle.includes('festival') || lowerDesc.includes('festival')) {
    categories.push('Festival');
  }
  
  if (lowerTitle.includes('market') || lowerDesc.includes('market')) {
    categories.push('Market');
  }
  
  if (lowerTitle.includes('concert') || lowerDesc.includes('concert') || 
      lowerTitle.includes('music') || lowerDesc.includes('music')) {
    categories.push('Music');
  }
  
  if (lowerTitle.includes('food') || lowerDesc.includes('food')) {
    categories.push('Food');
  }
  
  if (lowerTitle.includes('art') || lowerDesc.includes('art')) {
    categories.push('Art');
  }
  
  if (lowerTitle.includes('family') || lowerDesc.includes('family') || 
      lowerTitle.includes('kid') || lowerDesc.includes('kid')) {
    categories.push('Family');
  }
  
  if (lowerTitle.includes('holiday') || lowerDesc.includes('holiday') || 
      lowerTitle.includes('christmas') || lowerDesc.includes('christmas') ||
      lowerTitle.includes('halloween') || lowerDesc.includes('halloween')) {
    categories.push('Holiday');
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
  if (lowerText.includes('free') || lowerText.includes('no charge') || 
      lowerText.includes('complimentary')) {
    return 'Free';
  }
  
  // Look for price patterns
  const priceMatches = text.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  return 'See website for details';
}

/**
 * Main function to scrape Port Credit events
 */
async function scrapePortCreditEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Port Credit website...');
    
    // Fetch HTML content from Port Credit website
    const response = await axios.get(PORT_CREDIT_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event containers on the page - adjust selectors based on actual website structure
    $('.event, .event-item, article, .tribe-events-list .type-tribe_events, .event-listing').each((i, el) => {
      try {
        const element = $(el);
        
        // Extract event details
        const title = element.find('h2, h3, h4, .title, .event-title, .tribe-events-list-event-title').text().trim();
        const dateText = element.find('.date, .event-date, time, [class*="date"], .tribe-event-date-start').text().trim();
        const timeText = element.find('.time, .event-time, [class*="time"], .tribe-event-time').text().trim();
        
        // Extract description
        const description = element.find('p, .description, .event-description, .content, .excerpt, .tribe-events-list-event-description').text().trim() || 
                           'Join us for this exciting community event in Port Credit! Visit the website for more details.';
        
        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/') 
              ? `https://portcredit.ca${imageUrl}` 
              : `https://portcredit.ca/${imageUrl}`;
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
              ? `https://portcredit.ca${eventUrl}` 
              : `https://portcredit.ca/${eventUrl}`;
          }
        }
        
        // Extract price information
        const priceText = element.find('.price, .event-price, [class*="price"], .tribe-events-cost').text().trim();
        
        // Extract location information if available
        const locationText = element.find('.location, .venue, [class*="location"], .tribe-events-venue-details').text().trim();
        
        // Skip events without title
        if (!title) return;
        
        // Create event object
        events.push({
          title,
          dateText,
          timeText,
          description,
          imageUrl,
          eventUrl: eventUrl || PORT_CREDIT_URL,
          priceText,
          locationText
        });
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Port Credit website`);
    
    // If no events found with primary selectors, try alternative selectors
    if (events.length === 0) {
      // Try other common selectors for different page layouts
      $('.eventlist-event, .events-list .item, .post, .card, [class*="event"]').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title').text().trim() || 'Port Credit Event';
          const dateText = element.find('.date, time, [class*="date"]').text().trim();
          const timeText = element.find('.time, [class*="time"]').text().trim();
          const description = element.find('p, .description, .excerpt, .summary').text().trim() || 
                             'Join us for this exciting community event in Port Credit! Visit the website for more details.';
          
          // Extract image if available
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            // Make URL absolute if relative
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/') 
                ? `https://portcredit.ca${imageUrl}` 
                : `https://portcredit.ca/${imageUrl}`;
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
                ? `https://portcredit.ca${eventUrl}` 
                : `https://portcredit.ca/${eventUrl}`;
            }
          }
          
          // Extract price information
          const priceText = element.find('.price, [class*="price"], .cost').text().trim();
          
          // Extract location information if available
          const locationText = element.find('.location, .venue, [class*="location"]').text().trim();
          
          // Create event object
          events.push({
            title,
            dateText,
            timeText,
            description,
            imageUrl,
            eventUrl: eventUrl || PORT_CREDIT_URL,
            priceText,
            locationText
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
        
        // Adjust venue information if specific location is provided
        const venue = { ...PORT_CREDIT_VENUE };
        if (event.locationText) {
          venue.name = `${PORT_CREDIT_VENUE.name} - ${event.locationText}`;
        }
        
        // Create formatted event
        const formattedEvent = {
          id: eventId,
          title: `Toronto - ${event.title}`,
          description: event.description,
          categories: extractCategories(event.title, event.description),
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: venue,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || PORT_CREDIT_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'See website for details',
          location: 'Mississauga, Ontario',
          sourceURL: PORT_CREDIT_URL,
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
      console.warn('⚠️ Warning: No events found on Port Credit website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Port Credit events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Port Credit events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapePortCreditEvents()
  .then(addedEvents => {
    console.log(`✅ Port Credit scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Port Credit scraper:', error);
    process.exit(1);
  });
