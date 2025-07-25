/**
 * Rivoli Events Scraper
 * Based on events from https://rivoli.ca/events/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const RIVOLI_URL = 'https://rivoli.ca/events/';
const RIVOLI_VENUE = {
  name: 'Rivoli',
  address: '334 Queen St W, Toronto, ON M5V 2A2',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M5V 2A2',
  url: 'https://rivoli.ca',
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
  const dataToHash = `${RIVOLI_VENUE.name}-${title}-${startDate.toISOString()}`;
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
      // Time formats: "7:00 PM", "7 PM", "19:00", "7:00 PM - 9:00 PM", "Doors 7 PM", "Doors at 7 PM"
      
      // Extract time from format like "Doors 7 PM" or "Doors at 7 PM"
      if (timeText.toLowerCase().includes('door')) {
        const doorTimeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (doorTimeMatch) {
          let hours = parseInt(doorTimeMatch[1], 10);
          const minutes = doorTimeMatch[2] ? parseInt(doorTimeMatch[2], 10) : 0;
          const period = doorTimeMatch[3] ? doorTimeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // For door time, assume the show starts 30 minutes later and lasts 2 hours
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2, endDate.getMinutes() + 30);
        } else {
          // Default for door times without specific time
          startDate.setHours(20, 0, 0, 0); // 8:00 PM default
          endDate.setHours(23, 0, 0, 0);   // 11:00 PM default
        }
      } 
      // Check if time range is provided
      else if (timeText.includes(' - ') || timeText.includes(' to ')) {
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
          startDate.setHours(20, 0, 0, 0); // 8:00 PM default for venue events
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
          endDate.setHours(23, 0, 0, 0); // 11:00 PM default
        }
      } else {
        // Single time, assume event lasts 3 hours (typical for venue shows)
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // Default event duration is 3 hours for venue shows
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
        } else {
          // Default times if parsing fails
          startDate.setHours(20, 0, 0, 0); // 8:00 PM default
          endDate.setHours(23, 0, 0, 0);   // 11:00 PM default
        }
      }
    } else {
      // Default times if no time provided
      startDate.setHours(20, 0, 0, 0); // 8:00 PM default for evening shows
      endDate.setHours(23, 0, 0, 0);   // 11:00 PM default
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
  const categories = ['Toronto', 'Nightlife', 'Entertainment'];
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  if (lowerTitle.includes('concert') || lowerDesc.includes('concert') || 
      lowerTitle.includes('band') || lowerDesc.includes('band')) {
    categories.push('Concert');
  }
  
  if (lowerTitle.includes('music') || lowerDesc.includes('music') ||
      lowerTitle.includes('dj') || lowerDesc.includes('dj')) {
    categories.push('Music');
  }
  
  if (lowerTitle.includes('comedy') || lowerDesc.includes('comedy') ||
      lowerTitle.includes('stand-up') || lowerDesc.includes('stand-up') ||
      lowerTitle.includes('stand up') || lowerDesc.includes('stand up')) {
    categories.push('Comedy');
  }
  
  if (lowerTitle.includes('dance') || lowerDesc.includes('dance')) {
    categories.push('Dance');
  }
  
  if (lowerTitle.includes('theatre') || lowerDesc.includes('theatre') ||
      lowerTitle.includes('theater') || lowerDesc.includes('theater')) {
    categories.push('Theatre');
  }
  
  if (lowerTitle.includes('art') || lowerDesc.includes('art')) {
    categories.push('Art');
  }
  
  if (lowerTitle.includes('rock') || lowerDesc.includes('rock')) {
    categories.push('Rock');
  }
  
  if (lowerTitle.includes('jazz') || lowerDesc.includes('jazz')) {
    categories.push('Jazz');
  }
  
  if (lowerTitle.includes('hip hop') || lowerDesc.includes('hip hop') ||
      lowerTitle.includes('rap') || lowerDesc.includes('rap')) {
    categories.push('Hip Hop');
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
  if (lowerText.includes('free') || lowerText.includes('no cover')) {
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
 * Main function to scrape Rivoli events
 */
async function scrapeRivoliEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Rivoli website...');
    
    // Fetch HTML content from Rivoli website
    const response = await axios.get(RIVOLI_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event containers on the page - adjust selectors based on actual website structure
    $('.event, .event-item, article, .entry, .post, .eventitem, .event-card, .show').each((i, el) => {
      try {
        const element = $(el);
        
        // Extract event details
        const title = element.find('h2, h3, h4, .title, .event-title').text().trim();
        const dateText = element.find('.date, .event-date, time, [class*="date"]').text().trim();
        const timeText = element.find('.time, .event-time, [class*="time"], .doors').text().trim();
        
        // Extract description
        const description = element.find('p, .description, .event-description, .content, .excerpt').text().trim() || 
                           'Join us for this special event at Rivoli! Visit our website for more details.';
        
        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/') 
              ? `https://rivoli.ca${imageUrl}` 
              : `https://rivoli.ca/${imageUrl}`;
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
              ? `https://rivoli.ca${eventUrl}` 
              : `https://rivoli.ca/${eventUrl}`;
          }
        }
        
        // Extract price information
        const priceText = element.find('.price, .event-price, [class*="price"], .cost, .ticket').text().trim();
        
        // Skip events without title
        if (!title) return;
        
        // Create event object
        events.push({
          title,
          dateText,
          timeText,
          description,
          imageUrl,
          eventUrl: eventUrl || RIVOLI_URL,
          priceText
        });
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Rivoli website`);
    
    // If no events found with primary selectors, try alternative selectors
    if (events.length === 0) {
      // Try other common selectors for different page layouts
      $('.events-list .item, .card, [class*="event"], .row .event-listing, .event-wrapper, .show-item').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title').text().trim() || 'Rivoli Event';
          const dateText = element.find('.date, time, [class*="date"]').text().trim();
          const timeText = element.find('.time, [class*="time"], .doors').text().trim();
          const description = element.find('p, .description, .excerpt').text().trim() || 
                             'Join us for this special event at Rivoli! Visit our website for more details.';
          
          // Extract image if available
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            // Make URL absolute if relative
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/') 
                ? `https://rivoli.ca${imageUrl}` 
                : `https://rivoli.ca/${imageUrl}`;
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
                ? `https://rivoli.ca${eventUrl}` 
                : `https://rivoli.ca/${eventUrl}`;
            }
          }
          
          // Extract price information
          const priceText = element.find('.price, [class*="price"], .cost, .ticket').text().trim();
          
          // Create event object
          events.push({
            title,
            dateText,
            timeText,
            description,
            imageUrl,
            eventUrl: eventUrl || RIVOLI_URL,
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
          venue: RIVOLI_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || RIVOLI_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'See website for details',
          location: 'Toronto, Ontario',
          sourceURL: RIVOLI_URL,
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
      console.warn('⚠️ Warning: No events found on Rivoli website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Rivoli events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Rivoli events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeRivoliEvents()
  .then(addedEvents => {
    console.log(`✅ Rivoli scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Rivoli scraper:', error);
    process.exit(1);
  });
