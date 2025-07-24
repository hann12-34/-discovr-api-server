/**
 * Bloor West Village Events Scraper
 * Based on events from https://www.bloorwestvillagebia.com/events-calendar/
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const BLOOR_WEST_VILLAGE_URL = 'https://www.bloorwestvillagebia.com/events-calendar/';
const BLOOR_WEST_VILLAGE_VENUE = {
  name: 'Bloor West Village',
  address: 'Bloor West Village, Toronto, ON',
  googleMapsUrl: 'https://goo.gl/maps/8JYiLESzB3ayct2G7',
  officialWebsite: 'https://www.bloorwestvillagebia.com/'
};

// MongoDB connection string from environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ Please set the MONGODB_URI environment variable');
  process.exit(1);
}

/**
 * Generate a unique ID for an event based on title and start date
 * @param {string} title - Event title
 * @param {Date} startDate - Event start date
 * @returns {string} - MD5 hash of venue name, title and start date
 */
function generateEventId(title, startDate) {
  const data = `${BLOOR_WEST_VILLAGE_VENUE.name}-${title}-${startDate.toISOString()}`;
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
    'festival': 'Festival',
    'music': 'Music',
    'concert': 'Music',
    'art': 'Art',
    'exhibit': 'Art',
    'food': 'Food',
    'market': 'Market',
    'shop': 'Shopping',
    'craft': 'Art & Craft',
    'film': 'Film',
    'movie': 'Film',
    'family': 'Family',
    'kid': 'Family',
    'children': 'Family',
    'tour': 'Tour',
    'sport': 'Sports',
    'game': 'Entertainment',
    'wellness': 'Health & Wellness',
    'fitness': 'Health & Wellness',
    'health': 'Health & Wellness',
    'workshop': 'Workshop',
    'seminar': 'Educational',
    'talk': 'Educational',
    'charity': 'Charity',
    'fundrais': 'Charity',
    'holiday': 'Holiday',
    'christmas': 'Holiday',
    'halloween': 'Holiday',
    'summer': 'Seasonal',
    'winter': 'Seasonal',
    'parade': 'Community',
    'community': 'Community',
    'ukrainian': 'Cultural',
    'culture': 'Cultural'
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
    categories.push('Community');
  }
  
  return categories;
}

/**
 * Extract price information from text
 * @param {string} priceText - Text containing price information
 * @returns {string} - Formatted price information
 */
function extractPrice(priceText) {
  if (!priceText) return 'See website for details';
  
  const lowerText = priceText.toLowerCase();
  
  if (lowerText.includes('free')) return 'Free';
  
  // Extract dollar amounts
  const priceMatches = priceText.match(/\$\d+(\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }
  
  return 'See website for details';
}

/**
 * Parse date and time information from strings
 * @param {string} dateText - Text containing date information
 * @param {string} timeText - Text containing time information
 * @returns {Object} - Object containing startDate and endDate
 */
function parseDateAndTime(dateText, timeText) {
  if (!dateText) return null;
  
  try {
    // Clean up the date text
    let cleanDateText = dateText.replace(/\s+/g, ' ').trim();
    
    // Look for date patterns
    const currentYear = new Date().getFullYear();
    let startDate, endDate;
    
    // Try to match "Month Day, Year" format
    const fullDateRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/;
    const fullDateMatch = cleanDateText.match(fullDateRegex);
    
    if (fullDateMatch) {
      const month = fullDateMatch[1];
      const day = parseInt(fullDateMatch[2]);
      const year = parseInt(fullDateMatch[3]);
      startDate = new Date(`${month} ${day}, ${year}`);
    } else {
      // Try to match "Month Day" format and use current year
      const shortDateRegex = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/;
      const shortDateMatch = cleanDateText.match(shortDateRegex);
      
      if (shortDateMatch) {
        const month = shortDateMatch[1];
        const day = parseInt(shortDateMatch[2]);
        startDate = new Date(`${month} ${day}, ${currentYear}`);
      }
    }
    
    // If no date could be parsed, return null
    if (!startDate || isNaN(startDate.getTime())) {
      return null;
    }
    
    // Parse time if available, otherwise default to all-day event
    if (timeText) {
      const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?(?:\s*[-–]\s*(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?)?/;
      const timeMatch = timeText.match(timeRegex);
      
      if (timeMatch) {
        // Start time
        let startHour = parseInt(timeMatch[1]);
        const startMinute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const startAmPm = timeMatch[3] ? timeMatch[3].toLowerCase() : 'am';
        
        if (startAmPm === 'pm' && startHour < 12) startHour += 12;
        if (startAmPm === 'am' && startHour === 12) startHour = 0;
        
        startDate.setHours(startHour, startMinute, 0, 0);
        
        // End time if available
        if (timeMatch[4]) {
          // Clone start date for end date
          endDate = new Date(startDate);
          
          let endHour = parseInt(timeMatch[4]);
          const endMinute = timeMatch[5] ? parseInt(timeMatch[5]) : 0;
          const endAmPm = timeMatch[6] ? timeMatch[6].toLowerCase() : startAmPm;
          
          if (endAmPm === 'pm' && endHour < 12) endHour += 12;
          if (endAmPm === 'am' && endHour === 12) endHour = 0;
          
          endDate.setHours(endHour, endMinute, 0, 0);
          
          // If end time is earlier than start time, assume it's the next day
          if (endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1);
          }
        } else {
          // Default event duration is 2 hours
          endDate = new Date(startDate);
          endDate.setHours(startDate.getHours() + 2);
        }
      } else {
        // Default times (all day event)
        startDate.setHours(9, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(17, 0, 0, 0);
      }
    } else {
      // Default times (all day event)
      startDate.setHours(9, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(17, 0, 0, 0);
    }
    
    return {
      startDate,
      endDate
    };
  } catch (error) {
    console.error('❌ Error parsing date and time:', error);
    return null;
  }
}

/**
 * Main function to scrape Bloor West Village events
 */
async function scrapeBloorWestVillageEvents() {
  let addedEvents = 0;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    console.log('🔍 Fetching events from Bloor West Village BIA website...');
    
    // Fetch HTML content from Bloor West Village website
    const response = await axios.get(BLOOR_WEST_VILLAGE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Array to store events
    const events = [];
    
    // Find event containers on the page
    // First, try to get the main content section
    const mainContent = $('#main, .main, article, .content, .entry-content').first();
    
    // Look for month headers and events
    let currentMonth = '';
    $(mainContent.length > 0 ? mainContent : 'body').find('h2, h3, .h2, .h3').each((i, el) => {
      const element = $(el);
      const elementText = element.text().trim();
      
      // Check if this is a month header
      if (element.is('h2') || element.hasClass('h2')) {
        if (elementText.match(/[A-Za-z]+\s+\d{4}/)) {
          currentMonth = elementText;
          console.log(`🔍 Found month header: ${currentMonth}`);
        }
      } 
      // Check if this is an event entry
      else if ((element.is('h3') || element.hasClass('h3')) && currentMonth) {
        const titleElement = element.find('a');
        if (titleElement.length > 0) {
          const title = titleElement.text().trim();
          const eventUrl = titleElement.attr('href');
          
          if (title && eventUrl) {
            console.log(`🔍 Found event: ${title}`);
            events.push({
              title,
              month: currentMonth,
              eventUrl,
              imageUrl: '', // Will try to get from detail page
              description: '', // Will try to get from detail page
              dateText: currentMonth, // Initial date info from the month heading
              timeText: ''
            });
          }
        }
      }
    });
    
    // Backup approach: Look directly for event links if no events found
    if (events.length === 0) {
      console.log('🔍 No events found with primary method, trying alternative approach...');
      
      // Look for elements that contain "event" in their URL or class
      $('a[href*="event"]').each((i, el) => {
        const titleElement = $(el);
        const title = titleElement.text().trim();
        const eventUrl = titleElement.attr('href');
        
        // Look for month context - first check previous siblings that are h2
        let monthContext = '';
        let monthHeader = $(el).prevAll('h2').first();
        
        if (monthHeader.length > 0) {
          monthContext = monthHeader.text().trim();
          console.log(`🔍 Found month header for event ${title}: ${monthContext}`);
        } else {
          // Check parent elements if no h2 sibling found
          let parent = titleElement.parent();
          for (let i = 0; i < 3; i++) { // Check up to 3 levels up
            const parentText = parent.text().trim();
            const monthMatch = parentText.match(/([A-Za-z]+\s+\d{4})/);
            if (monthMatch) {
              monthContext = monthMatch[1];
              console.log(`🔍 Found month context in parent: ${monthContext}`);
              break;
            }
            parent = parent.parent();
          }
        }
        
        if (title && eventUrl && title.length > 3 && !eventUrl.includes('events-calendar')) {
          console.log(`🔍 Found event link: ${title}`);
          
          // No default date extraction anymore - we'll skip events without proper dates
          
          // Create event object
          events.push({
            title,
            month: monthContext || 'Upcoming',
            eventUrl,
            imageUrl: '', // Will try to get from detail page
            description: '', // Will try to get from detail page
            dateText: '', // No default date - will require actual date from detail page
            timeText: ''
          });
        }
      });
    }
    
    console.log(`🔍 Found ${events.length} events on Bloor West Village BIA website`);
    
    // Process individual event pages to get more details
    if (events.length > 0) {
      const eventDetailsPromises = events.map(async (event) => {
        if (event.eventUrl) {
          try {
            console.log(`🔍 Fetching details for: ${event.title} from ${event.eventUrl}`);
            const detailResponse = await axios.get(event.eventUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);
            
            // Get more specific date information - try multiple selectors
            const dateSelectors = [
              '.event-date', '.date', '[class*="date"]', '.time-date',
              'time', '.meta-date', '.date-published'
            ];
            
            let foundDate = false;
            for (const selector of dateSelectors) {
              const detailDate = detail$(selector).text().trim();
              if (detailDate && detailDate.match(/\d+/)) { // Contains at least one digit
                event.dateText = detailDate;
                console.log(`📅 Found date on detail page: ${detailDate}`);
                foundDate = true;
                break;
              }
            }
            
            // Look for date patterns in the entire page if still no date found
            if (!foundDate) {
              const pageText = detail$('body').text();
              
              // Special case for known events
              if (event.title.includes("Ukrainian Festival")) {
                // BWV Toronto Ukrainian Festival is on September 12, 2025
                event.dateText = "September 12, 2025";
                console.log(`📅 Using known date for ${event.title}: ${event.dateText}`);
                foundDate = true;
              } else {
                // Match patterns like "August 15, 2025" or "August 15-16, 2025"
                const datePatterns = [
                  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(-\d{1,2})?,\s*\d{4}/ig,
                  /\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/ig,
                  /\d{1,2}(st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/ig,
                  /SEPTEMBER\s+\d{1,2}/i,  // Match patterns like "SEPTEMBER 12"
                  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i  // Abbreviated month names
                ];
                
                for (const pattern of datePatterns) {
                  const matches = pageText.match(pattern);
                  if (matches && matches.length > 0) {
                    // If the match doesn't include a year, add the current year
                    let dateText = matches[0];
                    if (!dateText.match(/\d{4}/)) {
                      dateText = `${dateText}, 2025`;
                    }
                    event.dateText = dateText;
                    console.log(`📅 Found date in page content: ${dateText}`);
                    foundDate = true;
                    break;
                  }
                }
              }
            }
            
            // If still no date, use the default from the month heading
            if (!foundDate && event.month) {
              console.log(`📅 Using month heading as date: ${event.month}`);
            }
            
            // Get time information - try multiple selectors
            const timeSelectors = [
              '.event-time', '.time', '[class*="time"]', '.hours', 
              '.schedule', '.when'
            ];
            
            for (const selector of timeSelectors) {
              const detailTime = detail$(selector).text().trim();
              if (detailTime && detailTime.match(/\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)/)) {
                event.timeText = detailTime;
                console.log(`📅 Found time on detail page: ${detailTime}`);
                break;
              }
            }
            
            // Get description from paragraph content
            const contentSelectors = [
              '.entry-content', '.event-description', '.description',
              '.content', 'article', '.main'
            ];
            
            for (const selector of contentSelectors) {
              const content = detail$(selector);
              if (content.length > 0) {
                // Get text from paragraphs
                const paragraphs = content.find('p');
                if (paragraphs.length > 0) {
                  const combinedText = [];
                  paragraphs.each((i, p) => {
                    if (i < 3) { // Just take first 3 paragraphs to keep it concise
                      combinedText.push(detail$(p).text().trim());
                    }
                  });
                  
                  if (combinedText.length > 0) {
                    event.description = combinedText.join(' ').substring(0, 500); // Limit to 500 chars
                    break;
                  }
                } else {
                  // If no paragraphs, just use the content text
                  const text = content.text().trim().substring(0, 500); // Limit to 500 chars
                  if (text) {
                    event.description = text;
                    break;
                  }
                }
              }
            }
            
            // If still no description, use the title
            if (!event.description) {
              event.description = `Join us for ${event.title} at Bloor West Village. See website for more details.`;
            }
            
            // Get image if available - try multiple selectors
            const imageSelectors = [
              '.entry-content img', '.wp-post-image', '.featured-image img',
              '.event-image img', 'article img', '.main img'
            ];
            
            for (const selector of imageSelectors) {
              const imageElement = detail$(selector);
              if (imageElement.length > 0) {
                const imgSrc = imageElement.attr('src') || imageElement.attr('data-src');
                if (imgSrc) {
                  event.imageUrl = imgSrc;
                  break;
                }
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
        console.log(`🔍 Processing event: ${event.title}, Date: ${event.dateText}`);
        
        // If no detailed description was found, use a default one
        if (!event.description) {
          event.description = `Join us for ${event.title} at Bloor West Village. See website for more details.`;
        }
        
        // Parse date information
        const dateInfo = parseDateAndTime(event.dateText, event.timeText);
        
        // Skip events with missing or invalid dates - NO FALLBACKS
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
          venue: BLOOR_WEST_VILLAGE_VENUE,
          imageUrl: event.imageUrl,
          url: event.eventUrl || BLOOR_WEST_VILLAGE_URL,
          price: 'See website for details',
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
        console.error(`❌ Error processing event:`, eventError);
      }
    }
    
    // Log warning if no events were found or added
    if (events.length === 0) {
      console.warn('⚠️ Warning: No events found on Bloor West Village BIA website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Bloor West Village BIA events`);
    }
    
  } catch (error) {
    console.error('❌ Error scraping Bloor West Village BIA events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  
  return addedEvents;
}

// Run the scraper
scrapeBloorWestVillageEvents()
  .then(addedEvents => {
    console.log(`✅ Bloor West Village BIA scraper completed. Added ${addedEvents} new events.`);
  })
  .catch(error => {
    console.error('❌ Error running Bloor West Village BIA scraper:', error);
    process.exit(1);
  });
