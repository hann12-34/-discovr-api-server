/**
 * Museum of Illusions Events Scraper
 * 
 * This script extracts events from the Museum of Illusions Toronto website
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
const BASE_URL = 'https://museumofillusions.ca';
const EVENTS_URL = 'https://museumofillusions.ca/current-events/';

// Venue information for Museum of Illusions
const MUSEUM_VENUE = {
  name: 'Museum of Illusions',
  address: '132 Front Street East, Toronto, ON M5A 1E2',
  city: 'Toronto',
  province: 'ON',
  country: 'Canada',
  postalCode: 'M5A 1E2',
  coordinates: {
    latitude: 43.6500,
    longitude: -79.3708
  }
};

// Categories for Museum of Illusions events
const MUSEUM_CATEGORIES = ['museum', 'illusions', 'attraction', 'toronto', 'art', 'entertainment', 'family'];

// Function to generate a unique ID for events
function generateEventId(title, startDate) {
  const dateStr = startDate instanceof Date ? startDate.toISOString() : new Date().toISOString();
  const data = `illusions-${title}-${dateStr}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Function to extract categories based on event text
function extractCategories(title, description) {
  const textToSearch = `${title} ${description}`.toLowerCase();
  const categories = [...MUSEUM_CATEGORIES]; // Start with default categories
  
  // Add specific categories based on keywords
  if (textToSearch.includes('magic') || textToSearch.includes('magician')) categories.push('magic');
  if (textToSearch.includes('kid') || textToSearch.includes('child') || textToSearch.includes('family')) categories.push('family-friendly');
  if (textToSearch.includes('special')) categories.push('special event');
  if (textToSearch.includes('workshop')) categories.push('workshop');
  if (textToSearch.includes('night')) categories.push('nightlife');
  if (textToSearch.includes('interactive')) categories.push('interactive');
  if (textToSearch.includes('summer')) categories.push('summer');
  if (textToSearch.includes('holiday') || textToSearch.includes('christmas')) categories.push('holiday');
  if (textToSearch.includes('halloween')) categories.push('halloween');
  
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
    
    // Pattern for ranges: "July 5 - August 31, 2025"
    const rangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–]\s*)([A-Za-z]+)?\s*(\d{1,2})(?:,?\s*(\d{4}))?/i;
    const rangeMatch = dateText.match(rangePattern);
    
    if (rangeMatch) {
      const startMonth = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2]);
      const endMonth = rangeMatch[3] || startMonth;
      const endDay = parseInt(rangeMatch[4]);
      const year = rangeMatch[5] || new Date().getFullYear().toString();
      
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      startDate.setHours(10, 0, 0); // Museum opening time
      
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      endDate.setHours(21, 0, 0); // Museum closing time
      
      return { startDate, endDate };
    }
    
    // Pattern for specific days: "Friday nights this summer"
    const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s+[Nn]ights?)?/i;
    const dayMatch = dateText.match(dayPattern);
    
    if (dayMatch) {
      const dayName = dayMatch[1].toLowerCase();
      const now = new Date();
      
      // Map day names to day index (0 = Sunday, etc.)
      const dayIndices = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };
      
      const dayIndex = dayIndices[dayName];
      const currentDayIndex = now.getDay();
      
      // Calculate days until the next occurrence of the specified day
      let daysUntilNext = (dayIndex - currentDayIndex + 7) % 7;
      if (daysUntilNext === 0) daysUntilNext = 7; // If today is the day, go to next week
      
      const startDate = new Date(now);
      startDate.setDate(now.getDate() + daysUntilNext);
      
      // If it's a night event, set evening hours; otherwise, use opening time
      if (dateText.toLowerCase().includes('night')) {
        startDate.setHours(19, 0, 0); // 7:00 PM
      } else {
        startDate.setHours(10, 0, 0); // 10:00 AM
      }
      
      const endDate = new Date(startDate);
      
      // If it's a night event, assume it goes until closing
      if (dateText.toLowerCase().includes('night')) {
        endDate.setHours(21, 0, 0); // 9:00 PM
      } else {
        endDate.setHours(17, 0, 0); // 5:00 PM for daytime events
      }
      
      return { startDate, endDate };
    }
    
    // Pattern for specific dates: "July 15, 2025"
    const specificDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i;
    const specificDateMatch = dateText.match(specificDatePattern);
    
    if (specificDateMatch) {
      const month = specificDateMatch[1];
      const day = parseInt(specificDateMatch[2]);
      const year = specificDateMatch[3] || new Date().getFullYear().toString();
      
      const startDate = new Date(`${month} ${day}, ${year}`);
      startDate.setHours(10, 0, 0); // Museum opening time
      
      const endDate = new Date(startDate);
      endDate.setHours(21, 0, 0); // Museum closing time
      
      return { startDate, endDate };
    }
    
    // Pattern for seasons: "this summer", "winter 2025"
    const seasonPattern = /(?:this\s+)?([Ss]ummer|[Ff]all|[Ww]inter|[Ss]pring)(?:\s+(\d{4}))?/i;
    const seasonMatch = dateText.match(seasonPattern);
    
    if (seasonMatch) {
      const season = seasonMatch[1].toLowerCase();
      const year = seasonMatch[2] || new Date().getFullYear().toString();
      
      let startDate, endDate;
      
      switch (season) {
        case 'summer':
          startDate = new Date(`June 21, ${year}`);
          endDate = new Date(`September 22, ${year}`);
          break;
        case 'fall':
          startDate = new Date(`September 23, ${year}`);
          endDate = new Date(`December 20, ${year}`);
          break;
        case 'winter':
          startDate = new Date(`December 21, ${year}`);
          endDate = new Date(`March 20, ${parseInt(year) + 1}`);
          break;
        case 'spring':
          startDate = new Date(`March 21, ${year}`);
          endDate = new Date(`June 20, ${year}`);
          break;
        default:
          startDate = new Date();
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 3);
      }
      
      startDate.setHours(10, 0, 0);
      endDate.setHours(21, 0, 0);
      
      return { startDate, endDate };
    }
    
    // Last resort: try direct parsing
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      const startDate = parsedDate;
      startDate.setHours(10, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(21, 0, 0);
      
      return { startDate, endDate };
    }
  } catch (error) {
    console.error(`❌ Failed to parse date: ${dateText}`, error);
  }
  
  // Default to current date if parsing fails
  const now = new Date();
  now.setHours(10, 0, 0);
  const endDate = new Date(now);
  endDate.setHours(21, 0, 0);
  return { startDate: now, endDate };
}

// Function to extract price information
function extractPrice(text) {
  if (!text) return 'See website for details';
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('free')) return 'Free';
  
  // Look for price patterns like $10, $10-$20
  const priceMatch = lowerText.match(/\$(\d+(?:\.\d{2})?)(?:\s*-\s*\$(\d+(?:\.\d{2})?))?/);
  if (priceMatch) {
    if (priceMatch[2]) {
      return `$${priceMatch[1]}-$${priceMatch[2]}`;
    } else {
      return `$${priceMatch[1]}`;
    }
  }
  
  if (lowerText.includes('buy ticket')) return 'Ticketed event';
  
  return 'See website for details';
}

// Main function to scrape Museum of Illusions events
async function scrapeMuseumOfIllusionsEvents() {
  let addedEvents = 0;
  
  try {
    console.log('🔍 Starting Museum of Illusions events scraper...');
    
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
    
    // Look for event headers/titles
    $('h2').each((index, element) => {
      const title = $(element).text().trim();
      if (title) {
        // Find the associated content/description
        let description = '';
        let dateText = '';
        let imageUrl = '';
        let eventUrl = '';
        
        // Get the parent container to look for related content
        const container = $(element).parent();
        
        // Look for description text
        container.find('p').each((i, p) => {
          const text = $(p).text().trim();
          if (text && !description) {
            description = text;
          }
        });
        
        // Look for links that might contain more details or be a "Buy tickets" link
        container.find('a').each((i, a) => {
          const href = $(a).attr('href');
          const text = $(a).text().trim();
          
          if (text.toLowerCase().includes('find out more') && href) {
            eventUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          } else if (text.toLowerCase().includes('buy ticket') && !eventUrl && href) {
            eventUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          }
        });
        
        // Look for images
        container.find('img').each((i, img) => {
          const src = $(img).attr('src');
          if (src && !imageUrl) {
            imageUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
          }
        });
        
        // Try to find date information in the description or surrounding text
        let dateContainer = container;
        let maxDepth = 3;
        while (maxDepth > 0 && !dateText) {
          dateText = dateContainer.text().match(/((?:this|every|on)\s+(?:summer|winter|spring|fall|monday|tuesday|wednesday|thursday|friday|saturday|sunday))|([A-Za-z]+\s+\d{1,2}(?:\s*[-–]\s*[A-Za-z]+\s+\d{1,2})?,?\s*\d{4}?)/i);
          dateText = dateText ? dateText[0] : '';
          if (!dateText) {
            dateContainer = dateContainer.parent();
            maxDepth--;
          }
        }
        
        // If we couldn't find a date in the text, use some heuristics based on the title
        if (!dateText && title.toLowerCase().includes('night')) {
          dateText = 'Friday nights this summer';
        }
        
        // Add to events array
        events.push({
          title,
          description,
          dateText,
          imageUrl,
          eventUrl,
        });
      }
    });
    
    console.log(`🔍 Found ${events.length} potential events`);
    
    // If we didn't find any events with headers, try looking for event links
    if (events.length === 0) {
      $('a').each((index, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        
        if (href && href.includes('/current-event/') && text) {
          // This looks like an event link
          const eventUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          events.push({
            title: text,
            description: '',
            dateText: '',
            imageUrl: '',
            eventUrl,
          });
        }
      });
    }
    
    // Process each event
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      try {
        console.log(`🔍 Processing event: ${event.title}`);
        
        // If we have an event URL, visit it to get more details
        if (event.eventUrl) {
          console.log(`🔍 Fetching details from ${event.eventUrl}...`);
          
          try {
            const eventResponse = await axios.get(event.eventUrl);
            const eventPage = cheerio.load(eventResponse.data);
            
            // Look for better description
            if (!event.description || event.description.length < 50) {
              const betterDescription = eventPage('p').text().trim();
              if (betterDescription && betterDescription.length > event.description.length) {
                event.description = betterDescription;
              }
            }
            
            // Look for date information
            if (!event.dateText) {
              const potentialDateText = eventPage('body').text().match(/((?:this|every|on)\s+(?:summer|winter|spring|fall|monday|tuesday|wednesday|thursday|friday|saturday|sunday))|([A-Za-z]+\s+\d{1,2}(?:\s*[-–]\s*[A-Za-z]+\s+\d{1,2})?,?\s*\d{4}?)/i);
              event.dateText = potentialDateText ? potentialDateText[0] : '';
            }
            
            // Look for better image
            if (!event.imageUrl) {
              eventPage('img').each((i, img) => {
                const src = eventPage(img).attr('src');
                if (src && (src.includes('.jpg') || src.includes('.png') || src.includes('.webp'))) {
                  event.imageUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                  return false; // Break the loop
                }
              });
            }
          } catch (error) {
            console.error(`❌ Error fetching event details: ${error.message}`);
          }
        }
        
        // Parse dates
        const { startDate, endDate } = parseDateText(event.dateText);
        
        // Extract price (default to website details since this site doesn't show prices directly)
        const price = extractPrice(event.description);
        
        // Generate unique ID
        const id = generateEventId(event.title, startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: id,
          title: `Toronto - ${event.title}`,
          description: event.description || `Event at Museum of Illusions: ${event.title}`,
          categories: extractCategories(event.title, event.description),
          startDate: startDate,
          endDate: endDate,
          venue: MUSEUM_VENUE,
          imageUrl: event.imageUrl || '',
          officialWebsite: event.eventUrl || EVENTS_URL,
          price: price,
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
        console.error(`❌ Error processing event: ${event.title}`, error);
      }
    }
    
    // If no events were found or added, log a warning but do not create sample events
    if (addedEvents === 0) {
      console.log('⚠️ No events were found on the Museum of Illusions website.');
    }
    
    console.log(`📊 Successfully added ${addedEvents} new Museum of Illusions events`);
  } catch (error) {
    console.error('❌ Error scraping Museum of Illusions events:', error);
  } finally {
    // Close MongoDB connection
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeMuseumOfIllusionsEvents()
  .then(addedEvents => {
    console.log(`✅ Museum of Illusions scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Museum of Illusions scraper:', error);
    process.exit(1);
  });
