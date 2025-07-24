/**
 * Flato Markham Theatre Events Scraper
 * Based on events from https://flatomarkhamtheatre.ca/Online/default.asp
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const FLATO_MARKHAM_URL = 'https://flatomarkhamtheatre.ca/Online/default.asp?doWork::WScontent::loadArticle=Load&BOparam::WScontent::loadArticle::article_id=C04EC5E2-B6F7-4C61-8330-C17ED6A9FD69&menu_id=5A16B5CC-1FF7-4875-921B-4EA7D913F6D5';
const FLATO_MARKHAM_BASE_URL = 'https://flatomarkhamtheatre.ca';
const FLATO_MARKHAM_VENUE = {
  name: "Flato Markham Theatre",
  address: '171 Town Centre Blvd, Markham, ON L3R 8G5',
  googleMapsUrl: 'https://goo.gl/maps/KbcjtDVkz9FkPT1v7',
  officialWebsite: 'https://flatomarkhamtheatre.ca/'
};

// MongoDB connection string from environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ Please set the MONGODB_URI environment variable');
  process.exit(1);
}

/**
 * Generate a unique ID for an event based on venue, title and start date
 * @param {string} title - Event title
 * @param {Date} startDate - Event start date
 * @returns {string} - MD5 hash of venue name, title and start date
 */
function generateEventId(title, startDate) {
  const data = `${FLATO_MARKHAM_VENUE.name}-${title}-${startDate.toISOString()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Extract categories from event title and description
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {Array<string>} - Array of categories
 */
function extractCategories(title, description) {
  const categories = [];
  const combinedText = `${title} ${description}`.toLowerCase();
  
  // Define category keywords
  const categoryMapping = {
    'concert': 'Music',
    'music': 'Music',
    'orchestra': 'Music',
    'symphony': 'Music',
    'band': 'Music',
    'jazz': 'Music',
    'blues': 'Music',
    'rock': 'Music',
    'classical': 'Music',
    'opera': 'Music',
    'piano': 'Music',
    'guitar': 'Music',
    'violin': 'Music',
    'dance': 'Dance',
    'ballet': 'Dance',
    'contemporary': 'Dance',
    'comedy': 'Comedy',
    'stand-up': 'Comedy',
    'improv': 'Comedy',
    'theatre': 'Theatre',
    'drama': 'Theatre',
    'play': 'Theatre',
    'musical': 'Theatre',
    'performance': 'Performance Art',
    'art': 'Visual Arts',
    'exhibit': 'Visual Arts',
    'family': 'Family',
    'children': 'Family',
    'kids': 'Family',
    'holiday': 'Holiday',
    'christmas': 'Holiday',
    'cultural': 'Cultural',
    'fundraiser': 'Charity',
    'benefit': 'Charity',
    'workshop': 'Workshop'
  };
  
  // Check for category matches
  Object.keys(categoryMapping).forEach(keyword => {
    if (combinedText.includes(keyword)) {
      const category = categoryMapping[keyword];
      if (!categories.includes(category)) {
        categories.push(category);
      }
    }
  });
  
  // Default category if none found
  if (categories.length === 0) {
    categories.push('Performance');
  }
  
  return categories;
}

/**
 * Parse date string to extract start and end dates
 * @param {string} dateString - Date string to parse
 * @param {string} timeString - Optional time string to parse
 * @returns {Object|null} - Object with startDate and endDate or null if parsing failed
 */
function parseEventDates(dateString, timeString) {
  if (!dateString) return null;
  
  try {
    // Clean up the date string
    dateString = dateString.replace(/\s+/g, ' ').trim();
    
    // Handle common date formats
    // Format: "Thursday, September 26, 2024 at 8:00PM"
    const fullDateTimeRegex = /([A-Za-z]+),?\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s*(?:at)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i;
    const fullDateTimeMatch = dateString.match(fullDateTimeRegex);
    
    if (fullDateTimeMatch) {
      const month = fullDateTimeMatch[2];
      const day = parseInt(fullDateTimeMatch[3], 10);
      const year = parseInt(fullDateTimeMatch[4], 10);
      let hour = parseInt(fullDateTimeMatch[5], 10);
      const minute = parseInt(fullDateTimeMatch[6], 10);
      const ampm = fullDateTimeMatch[8] ? fullDateTimeMatch[8].toUpperCase() : null;
      
      // Convert to 24-hour format if needed
      if (ampm === 'PM' && hour < 12) {
        hour += 12;
      } else if (ampm === 'AM' && hour === 12) {
        hour = 0;
      }
      
      const startDate = new Date(`${month} ${day}, ${year} ${hour}:${minute}:00`);
      
      // Set end time to 2 hours after start time for performances
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);
      
      return { startDate, endDate };
    }
    
    // Format: "September 26, 2024"
    const dateOnlyRegex = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i;
    const dateOnlyMatch = dateString.match(dateOnlyRegex);
    
    if (dateOnlyMatch) {
      const month = dateOnlyMatch[1];
      const day = parseInt(dateOnlyMatch[2], 10);
      const year = parseInt(dateOnlyMatch[3], 10);
      
      // If we have a separate time string
      if (timeString) {
        const timeRegex = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i;
        const timeMatch = timeString.match(timeRegex);
        
        if (timeMatch) {
          let hour = parseInt(timeMatch[1], 10);
          const minute = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[4] ? timeMatch[4].toUpperCase() : null;
          
          // Convert to 24-hour format if needed
          if (ampm === 'PM' && hour < 12) {
            hour += 12;
          } else if (ampm === 'AM' && hour === 12) {
            hour = 0;
          }
          
          const startDate = new Date(`${month} ${day}, ${year} ${hour}:${minute}:00`);
          
          // Set end time to 2 hours after start time for performances
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2);
          
          return { startDate, endDate };
        }
      }
      
      // Default to evening performance at 7:30 PM if no time provided
      const startDate = new Date(`${month} ${day}, ${year} 19:30:00`);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);
      
      return { startDate, endDate };
    }
    
    // If we're still here, we couldn't parse the date
    return null;
  } catch (error) {
    console.error('❌ Error parsing date string:', error);
    return null;
  }
}

/**
 * Extract the price information from text
 * @param {string} priceText - Text containing price information
 * @returns {string} - Formatted price information
 */
function extractPrice(priceText) {
  if (!priceText) return 'See website for details';
  
  const lowerText = priceText.toLowerCase();
  
  if (lowerText.includes('free')) return 'Free';
  
  // Extract dollar amounts
  const priceMatches = priceText.match(/\$\d+(?:\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  return 'See website for details';
}

/**
 * Main function to scrape Flato Markham Theatre events
 */
async function scrapeFlatoMarkhamEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Flato Markham Theatre website...');
    
    // Fetch HTML content
    const response = await axios.get(FLATO_MARKHAM_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event elements - assuming events are in table rows or list items
    $('.Article table tr, .events-list li, .event-item, .performance-list-item').each((i, element) => {
      const eventElement = $(element);
      
      // Extract event title
      const titleElement = eventElement.find('h2, h3, a, .event-title, .title');
      const title = titleElement.text().trim();
      
      // Extract event URL
      const linkElement = eventElement.find('a');
      const eventPath = linkElement.attr('href');
      const eventUrl = eventPath ? 
        (eventPath.startsWith('http') ? eventPath : `${FLATO_MARKHAM_BASE_URL}${eventPath.startsWith('/') ? eventPath : `/${eventPath}`}`) : 
        FLATO_MARKHAM_URL;
      
      // Extract date information
      const dateElement = eventElement.find('.date, .event-date, [class*="date"]');
      const dateText = dateElement.text().trim();
      
      // Extract time information
      const timeElement = eventElement.find('.time, .event-time, [class*="time"]');
      const timeText = timeElement.text().trim();
      
      // Extract description
      const descriptionElement = eventElement.find('.description, .event-description, p');
      const description = descriptionElement.text().trim();
      
      // Extract image URL
      const imageElement = eventElement.find('img');
      const imageSrc = imageElement.attr('src');
      const imageUrl = imageSrc ? 
        (imageSrc.startsWith('http') ? imageSrc : `${FLATO_MARKHAM_BASE_URL}${imageSrc.startsWith('/') ? imageSrc : `/${imageSrc}`}`) : 
        '';
      
      if (title && (dateText || eventUrl !== FLATO_MARKHAM_URL)) {
        events.push({
          title,
          eventUrl,
          dateText,
          timeText,
          description,
          imageUrl
        });
      }
    });
    
    console.log(`🔍 Found ${events.length} events on Flato Markham Theatre website`);
    
    // If the main event extraction didn't work, try an alternative approach
    if (events.length === 0) {
      console.log('🔍 No events found with primary method, trying alternative approach...');
      
      // Try to find events in article content or other containers
      $('.Article, #content, main').find('p, div, li').each((i, element) => {
        const text = $(element).text().trim();
        
        // Look for patterns that might indicate an event
        const titleDateRegex = /(.+?)[,\-–]?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})(?:\s*(?:at|@)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?))?/i;
        const match = text.match(titleDateRegex);
        
        if (match) {
          const title = match[1].trim();
          const dateText = match[2].trim();
          const timeText = match[3] ? match[3].trim() : '';
          
          // Get any nearby image
          const nearbyImage = $(element).prev().find('img');
          const imageSrc = nearbyImage.length ? nearbyImage.attr('src') : '';
          const imageUrl = imageSrc ? 
            (imageSrc.startsWith('http') ? imageSrc : `${FLATO_MARKHAM_BASE_URL}${imageSrc.startsWith('/') ? imageSrc : `/${imageSrc}`}`) : 
            '';
          
          events.push({
            title,
            eventUrl: FLATO_MARKHAM_URL,
            dateText,
            timeText,
            description: text,
            imageUrl
          });
        }
      });
      
      console.log(`🔍 Found ${events.length} events using alternative approach`);
    }
    
    // Process individual event URLs to get more details
    if (events.length > 0) {
      const eventDetailsPromises = events.map(async (event) => {
        if (event.eventUrl && event.eventUrl !== FLATO_MARKHAM_URL) {
          try {
            console.log(`🔍 Fetching details for: ${event.title} from ${event.eventUrl}`);
            
            const detailResponse = await axios.get(event.eventUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // If we don't have a date yet, try to extract it from the detail page
            if (!event.dateText) {
              const dateElement = detail$('.date, .event-date, [class*="date"], .performance-date, time');
              event.dateText = dateElement.text().trim();
              
              if (!event.dateText) {
                // Look for date patterns in the text
                const pageText = detail$('body').text();
                const datePatterns = [
                  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
                  /\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i
                ];
                
                for (const pattern of datePatterns) {
                  const matches = pageText.match(pattern);
                  if (matches && matches.length > 0) {
                    event.dateText = matches[0];
                    console.log(`📅 Found date in page text: ${matches[0]}`);
                    break;
                  }
                }
              }
            }
            
            // If we don't have a time yet, try to extract it
            if (!event.timeText) {
              const timeElement = detail$('.time, .event-time, [class*="time"], .performance-time');
              event.timeText = timeElement.text().trim();
              
              if (!event.timeText) {
                // Look for time patterns in the text
                const pageText = detail$('body').text();
                const timePatterns = [
                  /\d{1,2}:\d{2}\s*[ap]m/i,
                  /at\s+\d{1,2}(?::\d{2})?\s*[ap]m/i
                ];
                
                for (const pattern of timePatterns) {
                  const matches = pageText.match(pattern);
                  if (matches && matches.length > 0) {
                    // Clean up the time text
                    event.timeText = matches[0].replace(/at\s+/i, '').trim();
                    console.log(`⏰ Found time in page text: ${event.timeText}`);
                    break;
                  }
                }
              }
            }
            
            // If we don't have a description yet, try to extract it
            if (!event.description) {
              const descriptionElement = detail$('.description, .event-description, .performance-description, .content, .copy');
              if (descriptionElement.length) {
                event.description = descriptionElement.text().trim();
              } else {
                // Try to extract paragraphs
                const paragraphs = detail$('p');
                if (paragraphs.length) {
                  let description = '';
                  paragraphs.each((i, p) => {
                    if (i < 3) { // Limit to 3 paragraphs
                      const text = detail$(p).text().trim();
                      if (text && text.length > 30) { // Only include substantial paragraphs
                        description += text + ' ';
                      }
                    }
                  });
                  event.description = description.trim();
                }
              }
            }
            
            // Extract price information if available
            const priceElement = detail$('.price, .ticket-price, [class*="price"]');
            const priceText = priceElement.text().trim();
            if (priceText) {
              event.price = extractPrice(priceText);
            }
            
            // If we don't have an image URL yet, try to extract it
            if (!event.imageUrl) {
              const imageElement = detail$('.event-image img, .performance-image img, .featured-image img, main img').first();
              if (imageElement.length) {
                const imageSrc = imageElement.attr('src');
                if (imageSrc) {
                  event.imageUrl = imageSrc.startsWith('http') ? 
                    imageSrc : 
                    `${FLATO_MARKHAM_BASE_URL}${imageSrc.startsWith('/') ? imageSrc : `/${imageSrc}`}`;
                }
              }
            }
            
          } catch (detailError) {
            console.error(`❌ Error fetching details for event: ${event.title}`, detailError.message);
          }
        }
        return event;
      });
      
      // Wait for all detail requests to complete
      console.log('🔍 Fetching additional details from individual event pages...');
      await Promise.all(eventDetailsPromises);
    }
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}, Date: ${event.dateText || 'Unknown'}`);
        
        // If no description was found, use a default one
        if (!event.description) {
          event.description = `Join us for ${event.title} at Flato Markham Theatre. Please visit the website for more details.`;
        }
        
        // Parse date information - NO FALLBACKS
        const dateInfo = parseEventDates(event.dateText, event.timeText);
        
        // Skip events with missing or invalid dates
        if (!dateInfo || isNaN(dateInfo.startDate.getTime()) || isNaN(dateInfo.endDate.getTime())) {
          console.log(`⏭️ Skipping event with invalid or missing date: ${event.title}`);
          continue;
        }
        
        // Generate unique ID
        const eventId = generateEventId(event.title, dateInfo.startDate);
        
        // Create formatted event
        const formattedEvent = {
          id: eventId,
          title: event.title,
          description: event.description,
          categories: extractCategories(event.title, event.description),
          date: {
            start: dateInfo.startDate,
            end: dateInfo.endDate
          },
          venue: FLATO_MARKHAM_VENUE,
          imageUrl: event.imageUrl || '',
          url: event.eventUrl,
          price: event.price || 'See website for details',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Check for duplicates
        const existingEvent = await eventsCollection.findOne({
          $or: [
            { id: formattedEvent.id },
            { 
              title: formattedEvent.title,
              'date.start': formattedEvent.date.start
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
        console.error(`❌ Error processing event:`, eventError.message);
      }
    }
    
    // Log warning if no events were found or added
    if (events.length === 0) {
      console.warn('⚠️ Warning: No events found on Flato Markham Theatre website.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates or missing dates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Flato Markham Theatre events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Flato Markham Theatre events:', error.message);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeFlatoMarkhamEvents()
  .then(addedEvents => {
    console.log(`✅ Flato Markham Theatre scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Flato Markham Theatre scraper:', error);
    process.exit(1);
  });
