/**
 * Toronto Public Library Events Scraper
 * Based on events from https://www.torontopubliclibrary.ca/programs-and-classes/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const TORONTO_LIBRARY_URL = 'https://www.torontopubliclibrary.ca/programs-and-classes/';
const TORONTO_LIBRARY_VENUE = {
  name: 'Toronto Public Library',
  address: '789 Yonge St, Toronto, ON M4W 2G8',
  city: 'Toronto',
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M4W 2G8',
  url: 'https://www.torontopubliclibrary.ca',
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
  const dataToHash = `${TORONTO_LIBRARY_VENUE.name}-${title}-${startDate.toISOString()}`;
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
    
    // Remove day of week if present
    dateText = dateText.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*/i, '');
    
    let startDate, endDate;
    
    // Check if it's a date range
    if (dateText.includes(' - ') || dateText.includes(' to ') || dateText.includes(' – ')) {
      // Handle date range format (note: includes both hyphen and en-dash)
      const separator = dateText.includes(' - ') ? ' - ' : (dateText.includes(' – ') ? ' – ' : ' to ');
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
      if (timeText.includes(' - ') || timeText.includes(' to ') || timeText.includes(' – ')) {
        const separator = timeText.includes(' - ') ? ' - ' : (timeText.includes(' – ') ? ' – ' : ' to ');
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
          // Default start time for library events
          startDate.setHours(14, 0, 0, 0); // 2:00 PM default
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
          endDate.setHours(startDate.getHours() + 1, 0, 0, 0); // 1 hour default duration
        }
      } else {
        // Single time, assume event lasts 1 hour (typical for library events)
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
          
          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          
          // Default event duration is 1 hour for library events
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 1);
        } else {
          // Default times if parsing fails
          startDate.setHours(14, 0, 0, 0); // 2:00 PM default
          endDate.setHours(15, 0, 0, 0);   // 3:00 PM default
        }
      }
    } else {
      // Default times if no time provided - common library event times
      startDate.setHours(14, 0, 0, 0); // 2:00 PM default for library events
      endDate.setHours(15, 0, 0, 0);   // 3:00 PM default duration (1 hour)
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
function extractCategories(title, description, branch = '') {
  const categories = ['Toronto', 'Library', 'Education'];
  
  // Add branch as a category if available
  if (branch) {
    categories.push(`${branch} Branch`);
  }
  
  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';
  
  if (lowerTitle.includes('book') || lowerDesc.includes('book') ||
      lowerTitle.includes('read') || lowerDesc.includes('read') ||
      lowerTitle.includes('author') || lowerDesc.includes('author') ||
      lowerTitle.includes('novel') || lowerDesc.includes('novel') ||
      lowerTitle.includes('literature') || lowerDesc.includes('literature')) {
    categories.push('Books & Literature');
  }
  
  if (lowerTitle.includes('tech') || lowerDesc.includes('tech') ||
      lowerTitle.includes('computer') || lowerDesc.includes('computer') ||
      lowerTitle.includes('digital') || lowerDesc.includes('digital') ||
      lowerTitle.includes('coding') || lowerDesc.includes('coding') ||
      lowerTitle.includes('programming') || lowerDesc.includes('programming')) {
    categories.push('Technology');
  }
  
  if (lowerTitle.includes('kid') || lowerDesc.includes('kid') ||
      lowerTitle.includes('child') || lowerDesc.includes('child') ||
      lowerTitle.includes('toddler') || lowerDesc.includes('toddler') ||
      lowerTitle.includes('baby') || lowerDesc.includes('baby')) {
    categories.push('Kids');
  }
  
  if (lowerTitle.includes('teen') || lowerDesc.includes('teen') ||
      lowerTitle.includes('youth') || lowerDesc.includes('youth') ||
      lowerTitle.includes('young adult') || lowerDesc.includes('young adult')) {
    categories.push('Teens');
  }
  
  if (lowerTitle.includes('senior') || lowerDesc.includes('senior') ||
      lowerTitle.includes('older adult') || lowerDesc.includes('older adult') ||
      lowerTitle.includes('elder') || lowerDesc.includes('elder')) {
    categories.push('Seniors');
  }
  
  if (lowerTitle.includes('workshop') || lowerDesc.includes('workshop') ||
      lowerTitle.includes('class') || lowerDesc.includes('class')) {
    categories.push('Workshop');
  }
  
  if (lowerTitle.includes('talk') || lowerDesc.includes('talk') ||
      lowerTitle.includes('lecture') || lowerDesc.includes('lecture') ||
      lowerTitle.includes('discussion') || lowerDesc.includes('discussion') ||
      lowerTitle.includes('speaker') || lowerDesc.includes('speaker')) {
    categories.push('Talk');
  }
  
  if (lowerTitle.includes('club') || lowerDesc.includes('club') ||
      lowerTitle.includes('group') || lowerDesc.includes('group')) {
    categories.push('Club');
  }
  
  if (lowerTitle.includes('art') || lowerDesc.includes('art') ||
      lowerTitle.includes('craft') || lowerDesc.includes('craft') ||
      lowerTitle.includes('create') || lowerDesc.includes('create') ||
      lowerTitle.includes('paint') || lowerDesc.includes('paint') ||
      lowerTitle.includes('draw') || lowerDesc.includes('draw')) {
    categories.push('Arts & Crafts');
  }
  
  if (lowerTitle.includes('film') || lowerDesc.includes('film') ||
      lowerTitle.includes('movie') || lowerDesc.includes('movie') ||
      lowerTitle.includes('screening') || lowerDesc.includes('screening')) {
    categories.push('Film');
  }
  
  if (lowerTitle.includes('music') || lowerDesc.includes('music') ||
      lowerTitle.includes('concert') || lowerDesc.includes('concert') ||
      lowerTitle.includes('sing') || lowerDesc.includes('sing') ||
      lowerTitle.includes('performance') || lowerDesc.includes('performance')) {
    categories.push('Music');
  }
  
  if (lowerTitle.includes('job') || lowerDesc.includes('job') ||
      lowerTitle.includes('career') || lowerDesc.includes('career') ||
      lowerTitle.includes('employment') || lowerDesc.includes('employment') ||
      lowerTitle.includes('resume') || lowerDesc.includes('resume') ||
      lowerTitle.includes('work') || lowerDesc.includes('work')) {
    categories.push('Career');
  }
  
  if (lowerTitle.includes('language') || lowerDesc.includes('language') ||
      lowerTitle.includes('english') || lowerDesc.includes('english') ||
      lowerTitle.includes('french') || lowerDesc.includes('french') ||
      lowerTitle.includes('spanish') || lowerDesc.includes('spanish') ||
      lowerTitle.includes('chinese') || lowerDesc.includes('chinese')) {
    categories.push('Language');
  }
  
  return [...new Set(categories)]; // Remove duplicates
}

/**
 * Extract price information from text
 */
function extractPrice(text) {
  if (!text) return 'Free';
  
  const lowerText = text.toLowerCase();
  
  // Most library events are free
  if (lowerText.includes('free') || !lowerText.includes('$')) {
    return 'Free';
  }
  
  // Look for price patterns
  const priceMatches = text.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  return 'Free';
}

/**
 * Main function to scrape Toronto Public Library events
 */
async function scrapeTorontoLibraryEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Toronto Public Library website...');
    
    // Fetch HTML content from Toronto Public Library website
    const response = await axios.get(TORONTO_LIBRARY_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event containers on the page - adjust selectors based on actual website structure
    $('.event, .programs-result, .program-item, .event-item, article, .program, .programs-list li, [class*="event"]').each((i, el) => {
      try {
        const element = $(el);
        
        // Extract event details
        const title = element.find('h2, h3, h4, .title, .program-title, [class*="title"]').text().trim();
        const dateText = element.find('.date, .program-date, [class*="date"], time').text().trim();
        const timeText = element.find('.time, .program-time, [class*="time"]').text().trim();
        
        // Extract branch information
        const branch = element.find('.branch, .location, .program-branch, [class*="branch"], [class*="location"]').text().trim();
        
        // Extract description
        const description = element.find('p, .description, .program-description, .content, .excerpt, [class*="description"]').text().trim() || 
                           'Join us at the Toronto Public Library for this special event! Visit our website for more details.';
        
        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/') 
              ? `https://www.torontopubliclibrary.ca${imageUrl}` 
              : `https://www.torontopubliclibrary.ca/${imageUrl}`;
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
              ? `https://www.torontopubliclibrary.ca${eventUrl}` 
              : `https://www.torontopubliclibrary.ca/${eventUrl}`;
          }
        }
        
        // Extract price information (most library events are free)
        const priceText = element.find('.price, .cost, .fee, [class*="price"], [class*="fee"]').text().trim();
        
        // Skip events without title
        if (!title) return;
        
        // Create event object
        events.push({
          title,
          dateText,
          timeText,
          description,
          branch,
          imageUrl,
          eventUrl: eventUrl || TORONTO_LIBRARY_URL,
          priceText: priceText || 'Free'
        });
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Toronto Public Library website`);
    
    // If no events found with primary selectors, try alternative selectors
    if (events.length === 0) {
      // Try other common selectors for different page layouts
      $('.cal-event, .calendar-event, .listing-item, .grid-item, .card, [class*="program"], .row .item').each((i, el) => {
        try {
          const element = $(el);
          
          const title = element.find('h2, h3, h4, .title, [class*="title"], [class*="heading"]').text().trim() || 'Toronto Public Library Event';
          const dateText = element.find('.date, time, [class*="date"]').text().trim();
          const timeText = element.find('.time, [class*="time"]').text().trim();
          const branch = element.find('.branch, .location, [class*="branch"], [class*="location"]').text().trim();
          const description = element.find('p, .description, .excerpt').text().trim() || 
                             'Join us at the Toronto Public Library for this special event! Visit our website for more details.';
          
          // Extract image if available
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            // Make URL absolute if relative
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/') 
                ? `https://www.torontopubliclibrary.ca${imageUrl}` 
                : `https://www.torontopubliclibrary.ca/${imageUrl}`;
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
                ? `https://www.torontopubliclibrary.ca${eventUrl}` 
                : `https://www.torontopubliclibrary.ca/${eventUrl}`;
            }
          }
          
          // Create event object
          events.push({
            title,
            dateText,
            timeText,
            description,
            branch,
            imageUrl,
            eventUrl: eventUrl || TORONTO_LIBRARY_URL,
            priceText: 'Free'
          });
        } catch (eventError) {
          console.error('❌ Error extracting event details with alternative selectors:', eventError);
        }
      });
      
      console.log(`🔍 Found ${events.length} events with alternative selectors`);
    }
    
    // Process individual event pages if needed
    if (events.length > 0) {
      const eventDetailsPromises = events.map(async (event) => {
        if (event.eventUrl && event.eventUrl !== TORONTO_LIBRARY_URL) {
          try {
            const detailResponse = await axios.get(event.eventUrl);
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // Try to get more detailed information
            const detailedDesc = detail$('.description, .content, .program-description, .details, [class*="description"], .event-details').text().trim();
            if (detailedDesc && detailedDesc.length > event.description.length) {
              event.description = detailedDesc;
            }
            
            // Try to get more detailed date information
            const detailedDateText = detail$('.dates, .date-range, .calendar, [class*="date"], .event-date').text().trim();
            if (detailedDateText && (!event.dateText || detailedDateText.length > event.dateText.length)) {
              event.dateText = detailedDateText;
            }
            
            // Try to get more detailed time information
            const detailedTimeText = detail$('.times, .time-range, [class*="time"], .event-time').text().trim();
            if (detailedTimeText && (!event.timeText || detailedTimeText.length > event.timeText.length)) {
              event.timeText = detailedTimeText;
            }
            
            // Try to get branch information if not already available
            if (!event.branch) {
              const detailedBranch = detail$('.branch, .location, [class*="branch"], [class*="location"]').text().trim();
              if (detailedBranch) {
                event.branch = detailedBranch;
              }
            }
            
          } catch (detailError) {
            console.error(`❌ Error fetching details for event: ${event.title}`, detailError);
          }
        }
        return event;
      });
      
      // Wait for all detail requests to complete
      events.length > 0 && console.log('🔍 Fetching additional details from individual event pages...');
      await Promise.all(eventDetailsPromises);
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
        
        // Modify venue if branch is specified
        const venue = { ...TORONTO_LIBRARY_VENUE };
        if (event.branch) {
          venue.name = `Toronto Public Library - ${event.branch}`;
        }
        
        // Create formatted event
        const formattedEvent = {
          id: eventId,
          title: `Toronto - ${event.title}`,
          description: event.description,
          categories: extractCategories(event.title, event.description, event.branch),
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: venue,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || TORONTO_LIBRARY_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'Free',
          location: 'Toronto, Ontario',
          sourceURL: TORONTO_LIBRARY_URL,
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
      console.warn('⚠️ Warning: No events found on Toronto Public Library website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Toronto Public Library events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Toronto Public Library events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeTorontoLibraryEvents()
  .then(addedEvents => {
    console.log(`✅ Toronto Public Library scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Toronto Public Library scraper:', error);
    process.exit(1);
  });
