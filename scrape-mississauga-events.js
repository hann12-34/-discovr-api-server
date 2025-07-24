/**
 * Mississauga Events Calendar Scraper
 * 
 * This script extracts events from the Mississauga events calendar website 
 * and adds them to the MongoDB database in the appropriate format.
 */

require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');
const cheerio = require('cheerio');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Base URL and API endpoints
const BASE_URL = 'https://www.mississauga.ca';
const EVENTS_URL = 'https://www.mississauga.ca/events-and-attractions/events-calendar/';
const EVENTS_API_URL = 'https://www.mississauga.ca/api/events/';

// Venue information for Mississauga events
const MISSISSAUGA_VENUE = {
  name: 'City of Mississauga',
  address: '300 City Centre Drive, Mississauga, ON L5B 3C1',
  city: 'Mississauga',
  province: 'ON',
  country: 'Canada',
  postalCode: 'L5B 3C1',
  coordinates: {
    latitude: 43.5890,
    longitude: -79.6441
  }
};

// Categories mapping
const CATEGORIES_MAPPING = {
  'family': ['family-friendly', 'family'],
  'culture': ['arts', 'culture'],
  'outdoors': ['outdoors', 'nature'],
  'sports': ['sports', 'recreation'],
  'community': ['community', 'civic'],
  'music': ['music', 'concert'],
  'workshop': ['workshop', 'education', 'learning'],
  'festival': ['festival', 'celebration'],
  'seasonal': ['seasonal', 'holiday']
};

// Function to fetch events from Mississauga calendar API
async function fetchMississaugaEvents() {
  try {
    // First, get the main events page to extract necessary tokens or structure
    console.log('🔍 Fetching Mississauga events page...');
    const mainPageResponse = await axios.get(EVENTS_URL);
    
    // Get current date in YYYY-MM-DD format for API query
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    // Calculate end date (3 months from today)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    // Fetch events data from the API endpoint
    console.log(`🔍 Fetching events from ${formattedDate} to ${formattedEndDate}...`);
    const apiUrl = `${EVENTS_API_URL}?startDate=${formattedDate}&endDate=${formattedEndDate}`;
    
    // Try fetching with Axios directly
    try {
      const response = await axios.get(apiUrl);
      return response.data;
    } catch (axiosError) {
      console.log('⚠️ Direct API request failed, trying alternative method...');
      
      // If direct API call fails, parse the main page to extract events
      const $ = cheerio.load(mainPageResponse.data);
      
      // Look for event listings on the page
      const events = [];
      
      // Since we don't know the exact structure, we'll look for common event elements
      $('.event-card, .event-listing, [data-event], [class*="event"]').each((i, element) => {
        const eventElement = $(element);
        
        // Try to extract event details
        const title = eventElement.find('[class*="title"], h2, h3, h4').first().text().trim();
        const description = eventElement.find('[class*="desc"], p').first().text().trim();
        const dateText = eventElement.find('[class*="date"], [datetime]').first().text().trim();
        const locationText = eventElement.find('[class*="location"], [class*="venue"]').first().text().trim();
        const imageUrl = eventElement.find('img').attr('src') || '';
        const eventUrl = eventElement.find('a').attr('href') || '';
        
        if (title) {
          events.push({
            title,
            description,
            dateText,
            locationText,
            imageUrl: imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`,
            eventUrl: eventUrl.startsWith('http') ? eventUrl : `${BASE_URL}${eventUrl}`
          });
        }
      });
      
      console.log(`📊 Extracted ${events.length} events from page parsing`);
      return events;
    }
  } catch (error) {
    console.error('❌ Error fetching Mississauga events:', error.message);
    return [];
  }
}

// Function to fetch additional details for an event
async function fetchEventDetails(eventUrl) {
  try {
    const response = await axios.get(eventUrl);
    const $ = cheerio.load(response.data);
    
    // Extract additional details
    const detailedDescription = $('.event-description, [class*="description"]').text().trim();
    const price = $('.event-price, [class*="price"]').text().trim() || 'Free';
    const category = $('.event-category, [class*="category"]').text().trim();
    
    return {
      detailedDescription: detailedDescription || null,
      price: price || null,
      category: category || null
    };
  } catch (error) {
    console.error(`❌ Error fetching details for ${eventUrl}:`, error.message);
    return { detailedDescription: null, price: null, category: null };
  }
}

// Parse date information from text
function parseDateFromText(dateText) {
  try {
    // Handle various date formats
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Try to extract date using regex patterns
    let startDate = null;
    let endDate = null;
    
    // Format: July 15, 2025
    const fullDateRegex = /([A-Za-z]+)\s+(\d{1,2})(?:,|\s)+(\d{4})/g;
    const fullDateMatches = [...dateText.matchAll(fullDateRegex)];
    
    if (fullDateMatches.length > 0) {
      const monthStr = fullDateMatches[0][1];
      const day = parseInt(fullDateMatches[0][2]);
      const year = parseInt(fullDateMatches[0][3]);
      const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
      
      startDate = new Date(year, monthIndex, day);
      
      // If there's a second date, use it as end date
      if (fullDateMatches.length > 1) {
        const endMonthStr = fullDateMatches[1][1];
        const endDay = parseInt(fullDateMatches[1][2]);
        const endYear = parseInt(fullDateMatches[1][3]);
        const endMonthIndex = new Date(`${endMonthStr} 1, 2000`).getMonth();
        
        endDate = new Date(endYear, endMonthIndex, endDay);
      } else {
        // Default to same day end
        endDate = new Date(startDate);
      }
    } else {
      // Format: July 15
      const monthDayRegex = /([A-Za-z]+)\s+(\d{1,2})/g;
      const monthDayMatches = [...dateText.matchAll(monthDayRegex)];
      
      if (monthDayMatches.length > 0) {
        const monthStr = monthDayMatches[0][1];
        const day = parseInt(monthDayMatches[0][2]);
        const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
        
        startDate = new Date(currentYear, monthIndex, day);
        
        // If there's a second date, use it as end date
        if (monthDayMatches.length > 1) {
          const endMonthStr = monthDayMatches[1][1];
          const endDay = parseInt(monthDayMatches[1][2]);
          const endMonthIndex = new Date(`${endMonthStr} 1, 2000`).getMonth();
          
          endDate = new Date(currentYear, endMonthIndex, endDay);
        } else {
          // Default to same day end
          endDate = new Date(startDate);
        }
      }
    }
    
    // If we still don't have dates, try time patterns
    if (!startDate) {
      startDate = now;
      endDate = now;
    }
    
    // Handle time parsing
    const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi;
    const timeMatches = [...dateText.matchAll(timeRegex)];
    
    if (timeMatches.length > 0) {
      const hour = parseInt(timeMatches[0][1]);
      const minute = timeMatches[0][2] ? parseInt(timeMatches[0][2]) : 0;
      const ampm = timeMatches[0][3].toLowerCase();
      
      let hours = hour;
      if (ampm === 'pm' && hour < 12) hours += 12;
      if (ampm === 'am' && hour === 12) hours = 0;
      
      startDate.setHours(hours, minute, 0, 0);
      
      // If there's a second time, use it for end date
      if (timeMatches.length > 1) {
        const endHour = parseInt(timeMatches[1][1]);
        const endMinute = timeMatches[1][2] ? parseInt(timeMatches[1][2]) : 0;
        const endAmpm = timeMatches[1][3].toLowerCase();
        
        let endHours = endHour;
        if (endAmpm === 'pm' && endHour < 12) endHours += 12;
        if (endAmpm === 'am' && endHour === 12) endHours = 0;
        
        endDate.setHours(endHours, endMinute, 0, 0);
      } else {
        // Default end time is 2 hours after start
        endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 2);
      }
    }
    
    return { startDate, endDate };
  } catch (error) {
    console.error('❌ Error parsing date:', error.message);
    const now = new Date();
    return { 
      startDate: now,
      endDate: new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
    };
  }
}

// Extract categories from event title and description
function extractCategories(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  const categories = [];
  
  // Check for each category keyword
  for (const [category, keywords] of Object.entries(CATEGORIES_MAPPING)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        categories.push(category);
        break;
      }
    }
  }
  
  // Always include toronto and mississauga tags
  categories.push('toronto', 'mississauga');
  
  // Remove duplicates
  return [...new Set(categories)];
}

// Function to process events and add to MongoDB
async function processMississaugaEvents() {
  let addedEvents = 0;
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    // Fetch events from Mississauga calendar
    const rawEvents = await fetchMississaugaEvents();
    
    // Check if we got events
    if (!rawEvents || (Array.isArray(rawEvents) && rawEvents.length === 0)) {
      console.log('⚠️ No events found or API returned unexpected data structure');
      return;
    }
    
    // Process each event
    const events = Array.isArray(rawEvents) ? rawEvents : 
                  (rawEvents.events ? rawEvents.events : []);
    
    console.log(`📊 Found ${events.length} Mississauga events to process`);
    
    for (const event of events) {
      try {
        // For API response format
        const title = event.title || event.name || event.eventTitle || '';
        const description = event.description || event.summary || event.eventDescription || '';
        const dateText = event.dateTime || event.date || event.eventDate || '';
        let imageUrl = event.image || event.imageUrl || event.eventImage || '';
        const eventUrl = event.url || event.eventUrl || '';
        let locationText = event.location || event.venue || event.eventLocation || '';
        
        // If locationText is empty, use default Mississauga venue
        if (!locationText) {
          locationText = 'City of Mississauga';
        }
        
        // If imageUrl is a relative URL, convert to absolute
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `${BASE_URL}${imageUrl}`;
        }
        
        // Fetch additional details if needed and if eventUrl is available
        let additionalDetails = {};
        if (eventUrl) {
          additionalDetails = await fetchEventDetails(eventUrl);
        }
        
        // Use detailed description if available, otherwise use the basic description
        const fullDescription = additionalDetails.detailedDescription || description;
        
        // Parse dates from text
        const { startDate, endDate } = parseDateFromText(dateText);
        
        // Extract categories
        const categories = extractCategories(title, fullDescription);
        
        // Create the formatted event object
        const formattedEvent = {
          title: `Toronto - ${title}`,
          description: fullDescription,
          categories: categories,
          startDate: startDate,
          endDate: endDate,
          venue: {
            name: locationText || MISSISSAUGA_VENUE.name,
            address: MISSISSAUGA_VENUE.address,
            city: MISSISSAUGA_VENUE.city,
            province: MISSISSAUGA_VENUE.province,
            country: MISSISSAUGA_VENUE.country,
            postalCode: MISSISSAUGA_VENUE.postalCode,
            coordinates: MISSISSAUGA_VENUE.coordinates
          },
          imageUrl: imageUrl,
          officialWebsite: eventUrl || EVENTS_URL,
          price: additionalDetails.price || 'Free',
          sourceURL: EVENTS_URL,
          lastUpdated: new Date()
        };
        
        // Check if event already exists to prevent duplicates
        const existingEvent = await eventsCollection.findOne({
          title: formattedEvent.title,
          startDate: formattedEvent.startDate
        });
        
        if (!existingEvent) {
          // Insert the new event
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
    
    console.log(`📊 Successfully added ${addedEvents} new Mississauga events`);
    
  } catch (error) {
    console.error('❌ Error processing Mississauga events:', error.message);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting Mississauga events scraper');
    const addedEvents = await processMississaugaEvents();
    console.log(`✅ Scraper completed. Added ${addedEvents} new events.`);
  } catch (error) {
    console.error('❌ Error in main function:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
