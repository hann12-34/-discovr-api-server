/**
 * Gallery TPW Events Scraper
 * 
 * This script extracts exhibitions and events from the Gallery TPW website
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
const BASE_URL = 'https://www.gallerytpw.ca';
const EVENTS_URL = 'https://www.gallerytpw.ca/current-upcoming';

// Venue information for Gallery TPW
const GALLERY_TPW_VENUE = {
  name: 'Gallery TPW',
  address: '170 St. Helens Ave, Toronto, ON M6H 4A1',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  postalCode: 'M6H 4A1',
  coordinates: {
    latitude: 43.6650,
    longitude: -79.4387
  }
};

// Categories for Gallery TPW events (art gallery focused)
const GALLERY_CATEGORIES = ['art', 'exhibition', 'gallery', 'photography', 'toronto', 'visual arts'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `gallerytpw-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...GALLERY_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('workshop') || textToSearch.includes('class')) categories.push('workshop');
  if (textToSearch.includes('artist talk') || textToSearch.includes('lecture')) categories.push('talk');
  if (textToSearch.includes('opening') || textToSearch.includes('reception')) categories.push('opening reception');
  if (textToSearch.includes('film') || textToSearch.includes('video') || textToSearch.includes('screening')) categories.push('film');
  if (textToSearch.includes('performance')) categories.push('performance');
  if (textToSearch.includes('installation')) categories.push('installation');
  if (textToSearch.includes('photography')) categories.push('photography');
  if (textToSearch.includes('digital') || textToSearch.includes('new media')) categories.push('digital');
  if (textToSearch.includes('community') || textToSearch.includes('social')) categories.push('community');
  if (textToSearch.includes('book') || textToSearch.includes('publication')) categories.push('publication');
  
  // Remove duplicates
  return [...new Set(categories)];
}

// Function to parse date text into JavaScript Date objects
function parseDateText(dateText) {
  if (!dateText) {
    const now = new Date();
    return { startDate: now, endDate: now };
  }
  
  // Clean and normalize the date text
  dateText = dateText.trim().replace(/\s+/g, ' ');
  
  try {
    // Try various date patterns:
    
    // Pattern for date range with months and year: "June 13 - August 31, 2025"
    const monthRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–]\s*)(?:([A-Za-z]+)\s+)?(\d{1,2})(?:,?\s*(\d{4}))?/i;
    const monthRangeMatch = dateText.match(monthRangePattern);
    
    if (monthRangeMatch) {
      const startMonth = monthRangeMatch[1];
      const startDay = parseInt(monthRangeMatch[2]);
      const endMonth = monthRangeMatch[3] || startMonth;
      const endDay = parseInt(monthRangeMatch[4]);
      const year = monthRangeMatch[5] || new Date().getFullYear();
      
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      startDate.setHours(11, 0, 0); // Gallery opens at 11am
      
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      endDate.setHours(17, 0, 0); // Gallery closes at 5pm
      
      return { startDate, endDate };
    }
    
    // Pattern for single date or date range with full dates: "July 18-19, 2025"
    const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–+]\s*)(?:\d{1,2})(?:,?\s*(\d{4}))?/i;
    const dateRangeMatch = dateText.match(dateRangePattern);
    
    if (dateRangeMatch) {
      const month = dateRangeMatch[1];
      const startDay = parseInt(dateRangeMatch[2]);
      const endDay = parseInt(dateRangeMatch[3] || startDay);
      const year = dateRangeMatch[4] || new Date().getFullYear();
      
      const startDate = new Date(`${month} ${startDay}, ${year}`);
      startDate.setHours(11, 0, 0);
      
      const endDate = new Date(`${month} ${endDay}, ${year}`);
      endDate.setHours(17, 0, 0);
      
      return { startDate, endDate };
    }
    
    // Check for specific time mentions
    const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)/i;
    const timeMatch = dateText.match(timePattern);
    let startHour = 11;
    let startMinute = 0;
    let endHour = 17;
    let endMinute = 0;
    
    if (timeMatch) {
      startHour = parseInt(timeMatch[1]);
      startMinute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3].toLowerCase();
      
      if (ampm === 'pm' && startHour < 12) {
        startHour += 12;
      }
      
      // Default end time is 2 hours after start for events with specific times
      endHour = startHour + 2;
      endMinute = startMinute;
    }
    
    // Try to parse as plain text date
    const singleDateMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
    
    if (singleDateMatch) {
      const month = singleDateMatch[1];
      const day = parseInt(singleDateMatch[2]);
      const year = singleDateMatch[3] || new Date().getFullYear();
      
      const startDate = new Date(`${month} ${day}, ${year}`);
      startDate.setHours(startHour, startMinute, 0);
      
      const endDate = new Date(`${month} ${day}, ${year}`);
      endDate.setHours(endHour, endMinute, 0);
      
      return { startDate, endDate };
    }
    
    // Last resort: try direct parsing
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      const startDate = parsedDate;
      startDate.setHours(11, 0, 0);
      
      const endDate = new Date(parsedDate);
      endDate.setHours(17, 0, 0);
      
      return { startDate, endDate };
    }
  } catch (error) {
    console.error(`❌ Failed to parse date: ${dateText}`, error);
  }
  
  // Default to current date if parsing fails
  const now = new Date();
  now.setHours(11, 0, 0);
  const endDate = new Date(now);
  endDate.setHours(17, 0, 0);
  return { startDate: now, endDate };
}

// Function to extract event details from specific event page
async function getEventDetails(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    let description = '';
    $('p').each(function() {
      const text = $(this).text().trim();
      if (text && text.length > 20) { // Looking for substantive paragraphs
        description += text + ' ';
      }
    });
    
    // Look for images
    let imageUrl = '';
    $('img').each(function() {
      const src = $(this).attr('src');
      if (src && (src.includes('.jpg') || src.includes('.png') || src.includes('.jpeg'))) {
        imageUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
        return false; // Break after finding the first good image
      }
    });
    
    return {
      description: description.trim(),
      imageUrl
    };
  } catch (error) {
    console.error(`❌ Error fetching details from ${url}:`, error.message);
    return { description: '', imageUrl: '' };
  }
}

// Main function to fetch and process Gallery TPW events
async function scrapeGalleryTPWEvents() {
  let addedEvents = 0;
  
  try {
    console.log('🔍 Starting Gallery TPW events scraper...');
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db('discovr');
    const eventsCollection = database.collection('events');
    
    // Fetch the events page
    const response = await axios.get(EVENTS_URL);
    const $ = cheerio.load(response.data);
    
    // Find exhibition sections
    const sections = ['CURRENT', 'UPCOMING'];
    const events = [];
    
    for (const section of sections) {
      const sectionHeader = $(`h1:contains("${section}")`);
      
      if (sectionHeader.length) {
        let currentElement = sectionHeader;
        
        // Process elements following the section header until the next section or end of content
        while (currentElement.next().length && !currentElement.next().is('h1')) {
          currentElement = currentElement.next();
          
          // Look for h3 headers which typically contain event titles and dates
          if (currentElement.is('h3')) {
            const eventText = currentElement.text().trim();
            
            if (eventText) {
              // Extract title and date from text
              let title = '';
              let dateText = '';
              
              // Split by common separators
              const parts = eventText.split(/\s+\|\s+|(?<=\D)(?=\d+\s*[-–+])|(?<=\d{4})/);
              
              if (parts.length > 1) {
                title = parts[0].trim();
                dateText = parts.slice(1).join(' ').trim();
              } else {
                title = eventText;
                
                // Look for date in subsequent elements
                let nextEl = currentElement.next();
                while (nextEl.length && !nextEl.is('h3') && !nextEl.is('h1')) {
                  const text = nextEl.text().trim();
                  if (text.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i)) {
                    dateText = text;
                    break;
                  }
                  nextEl = nextEl.next();
                }
              }
              
              // Get link to event details page if available
              let eventUrl = '';
              currentElement.find('a').each(function() {
                const href = $(this).attr('href');
                if (href && href.includes('gallerytpw.ca')) {
                  eventUrl = href;
                  return false; // Break after finding first link
                }
              });
              
              // If no link in title, look in nearby "Learn More" links
              if (!eventUrl) {
                let nextEl = currentElement.next();
                let found = false;
                
                while (!found && nextEl.length && !nextEl.is('h3') && !nextEl.is('h1')) {
                  nextEl.find('a:contains("Learn More")').each(function() {
                    const href = $(this).attr('href');
                    if (href && href.includes('gallerytpw.ca')) {
                      eventUrl = href;
                      found = true;
                      return false;
                    }
                  });
                  nextEl = nextEl.next();
                }
              }
              
              // Add event to list
              if (title) {
                events.push({
                  title,
                  dateText,
                  eventUrl: eventUrl.startsWith('http') ? eventUrl : `${BASE_URL}${eventUrl}`,
                  section
                });
              }
            }
          }
        }
      }
    }
    
    console.log(`🔍 Found ${events.length} potential events`);
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}`);
        
        // Get more details from the event page if available
        let description = '';
        let imageUrl = '';
        
        if (event.eventUrl) {
          const details = await getEventDetails(event.eventUrl);
          description = details.description;
          imageUrl = details.imageUrl;
        }
        
        // Parse dates
        const { startDate, endDate } = parseDateText(event.dateText);
        
        // For current events, if no specific start date is found,
        // assume it started recently (2 weeks ago)
        if (event.section === 'CURRENT' && isNaN(startDate.getTime())) {
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          startDate = twoWeeksAgo;
        }
        
        // Generate unique ID
        const id = generateEventId(event.title, startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: id,
          title: `Toronto - ${event.title}`,
          description: description || `Exhibition at Gallery TPW: ${event.title}`,
          categories: extractCategories(event.title, description),
          startDate: startDate,
          endDate: endDate,
          venue: GALLERY_TPW_VENUE,
          imageUrl: imageUrl,
          officialWebsite: event.eventUrl || EVENTS_URL,
          price: 'Free',
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
        console.error(`❌ Error processing event:`, error);
      }
    }
    
    // If no events were found, log a message
    if (addedEvents === 0) {
      console.log('⚠️ No events found on Gallery TPW website');
      console.log('🎉 No real events found, returning empty array (no fallback data)');
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Gallery TPW events`);
    
  } catch (error) {
    console.error('❌ Error scraping Gallery TPW events:', error);
  } finally {
    // Close MongoDB connection
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeGalleryTPWEvents()
  .then(addedEvents => {
    console.log(`✅ Gallery TPW scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Gallery TPW scraper:', error);
    process.exit(1);
  });
