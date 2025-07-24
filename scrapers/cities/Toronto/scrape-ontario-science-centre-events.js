/**
 * Ontario Science Centre Events Scraper
 * 
 * This script extracts events from the Ontario Science Centre website
 * and adds them to the MongoDB database in the appropriate format.
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Base URL and events page URL
const BASE_URL = 'https://www.ontariosciencecentre.ca';
const EVENTS_URL = 'https://www.ontariosciencecentre.ca/pop-ups-plus-events/events/';

// Venue information for Ontario Science Centre
const ONTARIO_SCIENCE_CENTRE_VENUE = {
  name: 'Ontario Science Centre',
  address: '770 Don Mills Rd, North York, ON M3C 1T3',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  postalCode: 'M3C 1T3',
  coordinates: {
    latitude: 43.7167,
    longitude: -79.3388
  }
};

// Categories for Ontario Science Centre events
const SCIENCE_CENTRE_CATEGORIES = ['science', 'education', 'toronto', 'family', 'exhibits', 'museum'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `ontariosciencecentre-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...SCIENCE_CENTRE_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('kid') || textToSearch.includes('children') || textToSearch.includes('junior')) categories.push('kids');
  if (textToSearch.includes('robot')) categories.push('robotics');
  if (textToSearch.includes('space') || textToSearch.includes('planet') || textToSearch.includes('star') || textToSearch.includes('astronomy')) categories.push('astronomy');
  if (textToSearch.includes('experiment') || textToSearch.includes('lab')) categories.push('experiments');
  if (textToSearch.includes('nature') || textToSearch.includes('environment')) categories.push('environment');
  if (textToSearch.includes('tech') || textToSearch.includes('technology')) categories.push('technology');
  if (textToSearch.includes('math')) categories.push('mathematics');
  if (textToSearch.includes('physics')) categories.push('physics');
  if (textToSearch.includes('chemistry')) categories.push('chemistry');
  if (textToSearch.includes('biology')) categories.push('biology');
  if (textToSearch.includes('workshop')) categories.push('workshop');
  if (textToSearch.includes('summer')) categories.push('summer');
  if (textToSearch.includes('webinar') || textToSearch.includes('virtual')) categories.push('virtual');
  if (textToSearch.includes('stem')) categories.push('stem');
  
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
    
    // Pattern for date ranges: "Thursday, July 31, 2025 – Sunday, August 3, 2025"
    const dateRangePattern = /([A-Za-z]+),?\s+([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?(?:\s*[–-]\s*)([A-Za-z]+),?\s+([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i;
    const dateRangeMatch = dateText.match(dateRangePattern);
    
    if (dateRangeMatch) {
      const startMonth = dateRangeMatch[2];
      const startDay = parseInt(dateRangeMatch[3]);
      const startYear = dateRangeMatch[4] || new Date().getFullYear().toString();
      
      const endMonth = dateRangeMatch[6];
      const endDay = parseInt(dateRangeMatch[7]);
      const endYear = dateRangeMatch[8] || startYear;
      
      const startDate = new Date(`${startMonth} ${startDay}, ${startYear}`);
      // Set default time to 10:00 AM for science centre events
      startDate.setHours(10, 0, 0);
      
      const endDate = new Date(`${endMonth} ${endDay}, ${endYear}`);
      // Set default end time to 5:00 PM for science centre events
      endDate.setHours(17, 0, 0);
      
      return { startDate, endDate };
    }
    
    // Pattern for single weekday with date: "Saturday, July 19, 2025"
    const singleDatePattern = /([A-Za-z]+),?\s+([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i;
    const singleDateMatch = dateText.match(singleDatePattern);
    
    if (singleDateMatch) {
      const month = singleDateMatch[2];
      const day = parseInt(singleDateMatch[3]);
      const year = singleDateMatch[4] || new Date().getFullYear().toString();
      
      const startDate = new Date(`${month} ${day}, ${year}`);
      startDate.setHours(10, 0, 0); // Default start time for science centre: 10:00 AM
      
      const endDate = new Date(startDate);
      endDate.setHours(17, 0, 0); // Default end time for science centre: 5:00 PM
      
      return { startDate, endDate };
    }
    
    // Pattern for recurring events: "Thursdays, July 3–August 28, 2025"
    const recurringDatePattern = /([A-Za-z]+)s,?\s+([A-Za-z]+)\s+(\d{1,2})(?:–|-|\s+to\s+)([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i;
    const recurringDateMatch = dateText.match(recurringDatePattern);
    
    if (recurringDateMatch) {
      const dayOfWeek = recurringDateMatch[1];
      const startMonth = recurringDateMatch[2];
      const startDay = parseInt(recurringDateMatch[3]);
      const endMonth = recurringDateMatch[4];
      const endDay = parseInt(recurringDateMatch[5]);
      const year = recurringDateMatch[6] || new Date().getFullYear().toString();
      
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      startDate.setHours(10, 0, 0);
      
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      endDate.setHours(17, 0, 0);
      
      // Add note about recurring day in description
      const recurringNote = `This event recurs on ${dayOfWeek}s from ${startMonth} ${startDay} to ${endMonth} ${endDay}, ${year}.`;
      
      return { startDate, endDate, recurringNote };
    }
    
    // Pattern for weekend events: "Saturday, July 26 & Sunday July 27, 2025"
    const weekendPattern = /([A-Za-z]+),?\s+([A-Za-z]+)\s+(\d{1,2})\s+&\s+([A-Za-z]+)\s+([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i;
    const weekendMatch = dateText.match(weekendPattern);
    
    if (weekendMatch) {
      const startMonth = weekendMatch[2];
      const startDay = parseInt(weekendMatch[3]);
      const endMonth = weekendMatch[5] || startMonth;
      const endDay = parseInt(weekendMatch[6]);
      const year = weekendMatch[7] || new Date().getFullYear().toString();
      
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      startDate.setHours(10, 0, 0);
      
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      endDate.setHours(17, 0, 0);
      
      return { startDate, endDate };
    }
    
    // Last resort: try direct parsing
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      const startDate = parsedDate;
      
      // Default to science centre hours if no time specified
      if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
        startDate.setHours(10, 0, 0); // 10:00 AM opening
      }
      
      const endDate = new Date(startDate);
      endDate.setHours(17, 0, 0); // 5:00 PM closing
      
      return { startDate, endDate };
    }
  } catch (error) {
    console.error(`❌ Failed to parse date: ${dateText}`, error);
  }
  
  // Default to current date if parsing fails
  const now = new Date();
  now.setHours(10, 0, 0); // Default opening time
  const endDate = new Date(now);
  endDate.setHours(17, 0, 0); // Default closing time
  return { startDate: now, endDate };
}

// Function to extract location information
function extractLocation(locationText) {
  if (!locationText) return 'Ontario Science Centre';
  
  // Handle virtual events
  if (locationText.toLowerCase().includes('virtual')) {
    return 'Virtual Event';
  }
  
  return locationText.trim();
}

// Main function to scrape Ontario Science Centre events
async function scrapeOntarioScienceCentreEvents() {
  let addedEvents = 0;
  
  try {
    console.log('🔍 Starting Ontario Science Centre events scraper...');
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Fetch the events page
    console.log(`🔍 Fetching events from ${EVENTS_URL}...`);
    const response = await axios.get(EVENTS_URL);
    const $ = cheerio.load(response.data);
    
    // Extract events
    const events = [];
    
    // Find all event cards/blocks
    const eventBlocks = $('a[href*="/pop-ups-plus-events/events/"]').filter(function() {
      // Filter out links that are not event cards
      const href = $(this).attr('href');
      return href && href !== EVENTS_URL && !href.includes('#');
    });
    
    console.log(`🔍 Found ${eventBlocks.length} potential events`);
    
    eventBlocks.each(function() {
      const eventLink = $(this);
      const eventUrl = eventLink.attr('href');
      
      // Get the text content
      const textContent = eventLink.text().trim();
      
      // Parse into title, location, date, and description
      // The format is typically: Title \n Location Date \n Description
      const lines = textContent.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length >= 1) {
        const title = lines[0].trim();
        let location = '';
        let dateText = '';
        let description = '';
        
        // Try to extract location and date from the second line
        if (lines.length >= 2) {
          const locationDateLine = lines[1];
          // Look for date patterns to split location and date
          const dateMatch = locationDateLine.match(/([A-Za-z]+day|[A-Za-z]+\s+\d{1,2}|[A-Za-z]+\s+\d{1,2}\s*[-–]\s*[A-Za-z]+\s+\d{1,2}|[A-Za-z]+\s+\d{1,2}\s*&\s*[A-Za-z]+\s+\d{1,2})/i);
          
          if (dateMatch) {
            const matchIndex = locationDateLine.indexOf(dateMatch[0]);
            if (matchIndex > 0) {
              location = locationDateLine.substring(0, matchIndex).trim();
              dateText = locationDateLine.substring(matchIndex).trim();
            } else {
              dateText = dateMatch[0];
            }
          } else {
            // If no date pattern found, assume it's all location
            location = locationDateLine;
          }
        }
        
        // Get description from the rest of the lines
        if (lines.length >= 3) {
          description = lines.slice(2).join(' ').trim();
        }
        
        // Construct absolute URL if it's relative
        const fullEventUrl = eventUrl.startsWith('http') ? eventUrl : `${BASE_URL}${eventUrl.startsWith('/') ? '' : '/'}${eventUrl}`;
        
        // Add event to the list
        events.push({
          title,
          location: extractLocation(location),
          dateText,
          description,
          eventUrl: fullEventUrl
        });
      }
    });
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}`);
        
        // If we have an event URL, visit it to get more details
        if (event.eventUrl) {
          console.log(`🔍 Fetching details from ${event.eventUrl}...`);
          
          try {
            const detailResponse = await axios.get(event.eventUrl);
            const detailPage = cheerio.load(detailResponse.data);
            
            // Extract better description if available
            const detailDescription = detailPage('div.wysiwyg p').text().trim();
            if (detailDescription && detailDescription.length > 20) {
              event.description = detailDescription;
            }
            
            // Extract image if available
            const imageEl = detailPage('img.heroImage').first();
            if (imageEl && imageEl.attr('src')) {
              event.imageUrl = imageEl.attr('src').startsWith('http') 
                ? imageEl.attr('src') 
                : `${BASE_URL}${imageEl.attr('src').startsWith('/') ? '' : '/'}${imageEl.attr('src')}`;
            }
            
            // Extract more detailed date if available
            const dateEl = detailPage('div.details time, div.details p:contains("Date")').first();
            if (dateEl && dateEl.text().trim()) {
              const detailedDate = dateEl.text().trim();
              if (detailedDate.length > event.dateText.length) {
                event.dateText = detailedDate;
              }
            }
          } catch (error) {
            console.error(`❌ Error fetching event details: ${error.message}`);
          }
        }
        
        // Parse dates
        const dateInfo = parseDateText(event.dateText);
        const { startDate, endDate, recurringNote } = dateInfo;
        
        // Include recurring note in description if it exists
        if (recurringNote) {
          event.description = `${event.description ? event.description + ' ' : ''}${recurringNote}`;
        }
        
        // Generate unique ID
        const id = generateEventId(event.title, startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: id,
          title: `Toronto - ${event.title}`,
          description: event.description || `${event.title} at ${event.location || 'Ontario Science Centre'}`,
          categories: extractCategories(event.title, event.description),
          startDate: startDate,
          endDate: endDate,
          venue: ONTARIO_SCIENCE_CENTRE_VENUE,
          imageUrl: event.imageUrl || '',
          officialWebsite: event.eventUrl || EVENTS_URL,
          price: 'See website for details',
          location: event.location,
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
    
    // If no events were found, log but do not create sample events
    if (addedEvents === 0) {
      console.log('⚠️ No events were found or added from the Ontario Science Centre website.');
    }
    
    // Log the results
    console.log(`📊 Successfully added ${addedEvents} new Ontario Science Centre events`);
    
  } catch (error) {
    console.error('❌ Error scraping Ontario Science Centre events:', error);
  } finally {
    // Close MongoDB connection
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeOntarioScienceCentreEvents()
  .then(addedEvents => {
    console.log(`✅ Ontario Science Centre scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Ontario Science Centre scraper:', error);
    process.exit(1);
  });
