/**
 * Popbox Mrkt Events Scraper
 * Based on events from https://popboxmrkt.com/events/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const POPBOX_URL = 'https://popboxmrkt.com/events/';
const POPBOX_VENUE = {
  name: 'Popbox Mrkt',
  address: '256 Christie St, Toronto, ON M6G 3B6',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M6G 3B6',
  url: 'https://popboxmrkt.com',
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
  const dataToHash = `${POPBOX_VENUE.name}-${title}-${startDate.toISOString()}`;
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
    
    // Common date formats: "January 15, 2025", "Jan 15, 2025", "2025-01-15"
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
          startDate.setHours(12, 0, 0, 0); // 12:00 PM default for market events
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
          endDate.setHours(19, 0, 0, 0); // 7:00 PM default for market events
        }
      } else {
        // Single time, assume event lasts 6 hours (typical for market events)
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // Default event duration is 6 hours for market events
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 6);
        } else {
          // Default times if parsing fails
          startDate.setHours(12, 0, 0, 0); // 12:00 PM default
          endDate.setHours(18, 0, 0, 0);   // 6:00 PM default
        }
      }
    } else {
      // Default times if no time provided
      startDate.setHours(12, 0, 0, 0); // 12:00 PM default
      endDate.setHours(18, 0, 0, 0);   // 6:00 PM default
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
  const categories = ['Toronto', 'Market', 'Shopping'];
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  if (lowerTitle.includes('pop-up') || lowerDesc.includes('pop-up') || 
      lowerTitle.includes('popup') || lowerDesc.includes('popup')) {
    categories.push('Pop-up');
  }
  
  if (lowerTitle.includes('vendor') || lowerDesc.includes('vendor')) {
    categories.push('Vendors');
  }
  
  if (lowerTitle.includes('art') || lowerDesc.includes('art')) {
    categories.push('Art');
  }
  
  if (lowerTitle.includes('craft') || lowerDesc.includes('craft')) {
    categories.push('Crafts');
  }
  
  if (lowerTitle.includes('food') || lowerDesc.includes('food')) {
    categories.push('Food');
  }
  
  if (lowerTitle.includes('vintage') || lowerDesc.includes('vintage')) {
    categories.push('Vintage');
  }
  
  if (lowerTitle.includes('local') || lowerDesc.includes('local')) {
    categories.push('Local');
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
      lowerText.includes('free admission') || lowerText.includes('free entry')) {
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
 * Main function to scrape Popbox Mrkt events
 */
async function scrapePopboxMrktEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Popbox Mrkt website...');
    
    // Fetch HTML content from Popbox Mrkt website
    const response = await axios.get(POPBOX_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event containers on the page - adjust selectors based on actual website structure
    $('.event, .event-item, article, .entry, .market-event').each((i, el) => {
      try {
        const element = $(el);
        
        // Extract event details
        const title = element.find('h2, h3, h4, .title, .event-title').text().trim();
        const dateText = element.find('.date, .event-date, time, [class*="date"]').text().trim();
        const timeText = element.find('.time, .event-time, [class*="time"]').text().trim();
        
        // Extract description
        const description = element.find('p, .description, .event-description, .content, .excerpt').text().trim() || 
                           'Join us for this special market event at Popbox Mrkt! Shop from local vendors and artists.';
        
        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/') 
              ? `https://popboxmrkt.com${imageUrl}` 
              : `https://popboxmrkt.com/${imageUrl}`;
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
              ? `https://popboxmrkt.com${eventUrl}` 
              : `https://popboxmrkt.com/${eventUrl}`;
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
          eventUrl: eventUrl || POPBOX_URL,
          priceText
        });
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Popbox Mrkt website`);
    
    // If no events found with primary selectors, try alternative selectors
    if (events.length === 0) {
      // Try other common selectors for different page layouts
      $('.events-list .item, .events-container .event, .post, .card, [class*="event"]').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title').text().trim() || 'Popbox Market Event';
          const dateText = element.find('.date, time, [class*="date"]').text().trim();
          const timeText = element.find('.time, [class*="time"]').text().trim();
          const description = element.find('p, .description, .excerpt').text().trim() || 
                             'Join us for this special market event at Popbox Mrkt! Shop from local vendors and artists.';
          
          // Extract image if available
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            // Make URL absolute if relative
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/') 
                ? `https://popboxmrkt.com${imageUrl}` 
                : `https://popboxmrkt.com/${imageUrl}`;
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
                ? `https://popboxmrkt.com${eventUrl}` 
                : `https://popboxmrkt.com/${eventUrl}`;
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
            eventUrl: eventUrl || POPBOX_URL,
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
          venue: POPBOX_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || POPBOX_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'See website for details',
          location: 'Toronto, Ontario',
          sourceURL: POPBOX_URL,
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
      console.warn('⚠️ Warning: No events found on Popbox Mrkt website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Popbox Mrkt events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Popbox Mrkt events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapePopboxMrktEvents()
  .then(addedEvents => {
    console.log(`✅ Popbox Mrkt scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Popbox Mrkt scraper:', error);
    process.exit(1);
  });
