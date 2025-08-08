/**
 * Royal Ontario Museum (ROM) Events Scraper
 * Based on events from https://www.rom.on.ca/en/whats-on
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const ROM_URL = 'https://www.rom.on.ca/en/whats-on';
const ROM_VENUE = {
  name: 'Royal Ontario Museum',
  address: '100 Queens Park, Toronto, ON M5S 2C6',
  city: city,
  region: 'Ontario',
  country: 'Canada',
  postalCode: 'M5S 2C6',
  url: 'https://www.rom.on.ca',
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
  const dataToHash = `${ROM_VENUE.name}-${title}-${startDate.toISOString()}`;
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
    if (dateText.includes(' - ') || dateText.includes(' to ') || dateText.includes(' – ') ||
        dateText.includes(' through ') || dateText.includes(' until ')) {
      // Handle date range format (note: includes both hyphen and en-dash)
      let separator = ' - ';
      if (dateText.includes(' - ')) separator = ' - ';
      else if (dateText.includes(' – ')) separator = ' – ';
      else if (dateText.includes(' to ')) separator = ' to ';
      else if (dateText.includes(' through ')) separator = ' through ';
      else if (dateText.includes(' until ')) separator = ' until ';

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
        const startTimeMatch = startTimeStr.match(/(\d{1,2}:?(\d{2}?\s*(am|pm|AM|PM)?/);
        if (startTimeMatch) {
          let hours = parseInt(startTimeMatch[1], 10);
          const minutes = startTimeMatch[2] ? parseInt(startTimeMatch[2], 10) : 0;
          const period = startTimeMatch[3] ? startTimeMatch[3].toLowerCase() : null;

          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;

          startDate.setHours(hours, minutes, 0, 0);
        } else {
          // Default start time for ROM events
          startDate.setHours(10, 0, 0, 0); // 10:00 AM default for museum opening
        }

        // Parse end time
        const endTimeMatch = endTimeStr.match(/(\d{1,2}:?(\d{2}?\s*(am|pm|AM|PM)?/);
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
          endDate.setHours(17, 30, 0, 0); // 5:30 PM default for museum closing
        }
      } else {
        // Single time, assume event duration based on type
        const timeMatch = timeText.match(/(\d{1,2}:?(\d{2}?\s*(am|pm|AM|PM)?/);

        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

          // Convert to 24-hour format if needed
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;

          startDate.setHours(hours, minutes, 0, 0);

          // Default event duration is 2 hours for museum events
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2);
        } else {
          // Default times if parsing fails
          startDate.setHours(10, 0, 0, 0); // 10:00 AM default
          endDate.setHours(12, 0, 0, 0);   // 12:00 PM default (2 hours)
        }
      }
    } else {
      // Default times if no time provided - regular museum hours
      startDate.setHours(10, 0, 0, 0);  // 10:00 AM default for museum opening
      endDate.setHours(17, 30, 0, 0);   // 5:30 PM default for museum closing
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
  const categories = ['Toronto', 'Museum', 'Culture', 'Arts & Culture'];

  // Add categories based on content
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description ? description.toLowerCase() : '';

  if (lowerTitle.includes('exhibit') || lowerDesc.includes('exhibit') ||
      lowerTitle.includes('exhibition') || lowerDesc.includes('exhibition') ||
      lowerTitle.includes('gallery') || lowerDesc.includes('gallery')) {
    categories.push('Exhibition');
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

  if (lowerTitle.includes('kid') || lowerDesc.includes('kid') ||
      lowerTitle.includes('child') || lowerDesc.includes('child') ||
      lowerTitle.includes('family') || lowerDesc.includes('family')) {
    categories.push('Family');
    categories.push('Kids');
  }

  if (lowerTitle.includes('tour') || lowerDesc.includes('tour') ||
      lowerTitle.includes('guided') || lowerDesc.includes('guided')) {
    categories.push('Tour');
  }

  if (lowerTitle.includes('history') || lowerDesc.includes('history')) {
    categories.push('History');
  }

  if (lowerTitle.includes('art') || lowerDesc.includes('art') ||
      lowerTitle.includes('gallery') || lowerDesc.includes('gallery')) {
    categories.push('Art');
  }

  if (lowerTitle.includes('science') || lowerDesc.includes('science') ||
      lowerTitle.includes('natural') || lowerDesc.includes('natural')) {
    categories.push('Science');
  }

  if (lowerTitle.includes('dinosaur') || lowerDesc.includes('dinosaur') ||
      lowerTitle.includes('fossil') || lowerDesc.includes('fossil')) {
    categories.push('Dinosaurs');
  }

  if (lowerTitle.includes('archaeology') || lowerDesc.includes('archaeology') ||
      lowerTitle.includes('ancient') || lowerDesc.includes('ancient')) {
    categories.push('Archaeology');
  }

  if (lowerTitle.includes('special') || lowerDesc.includes('special') ||
      lowerTitle.includes('featured') || lowerDesc.includes('featured') ||
      lowerTitle.includes('spotlight') || lowerDesc.includes('spotlight')) {
    categories.push('Special Event');
  }

  if (lowerTitle.includes('members') || lowerDesc.includes('members') ||
      lowerTitle.includes('member') || lowerDesc.includes('member') ||
      lowerTitle.includes('exclusive') || lowerDesc.includes('exclusive')) {
    categories.push('Members');
  }

  return [...new Set(categories)]; // Remove duplicates
}

/**
 * Extract price information from text
 */
function extractPrice(text) {
  if (!text) return 'Museum admission rates apply. See website for details';

  const lowerText = text.toLowerCase();

  // Check for free events
  if (lowerText.includes('free') || lowerText.includes('no charge')) {
    return 'Free';
  }

  // Check for member events
  if (lowerText.includes('member') && !lowerText.includes('non-member')) {
    return 'Free for members. See website for details';
  }

  // Look for price patterns
  const priceMatches = text.match(/\$\d+(\.\d{2}?/g);
  if (priceMatches && priceMatches.length > 0) {
    return priceMatches.join(' - ');
  }

  // Check for admission mentions
  if (lowerText.includes('admission') || lowerText.includes('included with')) {
    return 'Museum admission rates apply. See website for details';
  }

  return 'See website for details';
}

/**
 * Main function to scrape Royal Ontario Museum events
 */
async function scrapeROMEvents() {
  const city = city;
  if (!city) {
    console.error('❌ City argument is required. e.g. node scrape-rom-events.js Toronto');
    process.exit(1);
  }
  let addedEvents = 0;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const database = client.db();
    const eventsCollection = databases');

    console.log('🔍 Fetching events from Royal Ontario Museum website...');

    // Fetch HTML content from Royal Ontario Museum website
    const response = await axios.get(ROM_URL);
    const html = response.data;
    const $ = cheerio.load(html);

    // Array to store events
    const events = [];

    // Find event containers on the page - adjust selectors based on actual website structure
    $('.event, .event-card, .whats-on-event, .event-item, article, .entry, .events-list .item').each((i, el) => {
      try {
        const element = $(el);

        // Extract event details
        const title = element.find('h2, h3, h4, .title, .event-title').text().trim();
        const dateText = element.find('.date, .event-date, time, [class*="date"]').text().trim();
        const timeText = element.find('.time, .event-time, [class*="time"]').text().trim();

        // Extract description
        const description = element.find('p, .description, .event-description, .content, .excerpt').text().trim() ||
                           'Join us at the Royal Ontario Museum for this special event! Visit our website for more details.';

        // Extract image if available
        let imageUrl = '';
        const imageElement = element.find('img');
        if (imageElement.length > 0) {
          imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
          // Make URL absolute if relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/')
              ? `https://www.rom.on.ca${imageUrl}`
              : `https://www.rom.on.ca/${imageUrl}`;
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
              ? `https://www.rom.on.ca${eventUrl}`
              : `https://www.rom.on.ca/${eventUrl}`;
          }
        }

        // Extract price information
        const priceText = element.find('.price, .event-price, [class*="price"], .cost, .admission').text().trim();

        // Skip events without title
        if (!title) return;

        // Create event object
        events.push({
          title,
          dateText,
          timeText,
          description,
          imageUrl,
          eventUrl: eventUrl || ROM_URL,
          priceText
        };
      } catch (eventError) {
        console.error('❌ Error extracting event details:', eventError);
      }
    };

    console.log(`🔍 Found ${events.length} events on Royal Ontario Museum website`);

    // If no events found with primary selectors, try alternative selectors
    if (events.length === 0) {
      // Try other common selectors for different page layouts
      $('.views-row, .calendar-event, .grid-item, .card, [class*="event"], .teaser, .exhibition').each((i, el) => {
        try {
          const element = $(el);

          const title = element.find('h2, h3, h4, .title, [class*="title"]').text().trim() || 'ROM Event';
          const dateText = element.find('.date, time, [class*="date"], .field-date').text().trim();
          const timeText = element.find('.time, [class*="time"]').text().trim();
          const description = element.find('p, .description, .excerpt, .summary, .field-body').text().trim() ||
                             'Join us at the Royal Ontario Museum for this special event! Visit our website for more details.';

          // Extract image if available
          let imageUrl = '';
          const imageElement = element.find('img');
          if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            // Make URL absolute if relative
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/')
                ? `https://www.rom.on.ca${imageUrl}`
                : `https://www.rom.on.ca/${imageUrl}`;
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
                ? `https://www.rom.on.ca${eventUrl}`
                : `https://www.rom.on.ca/${eventUrl}`;
            }
          }

          // Extract price information
          const priceText = element.find('.price, [class*="price"], .cost, .admission, .field-cost').text().trim();

          // Create event object
          events.push({
            title,
            dateText,
            timeText,
            description,
            imageUrl,
            eventUrl: eventUrl || ROM_URL,
            priceText
          };
        } catch (eventError) {
          console.error('❌ Error extracting event details with alternative selectors:', eventError);
        }
      };

      console.log(`🔍 Found ${events.length} events with alternative selectors`);
    }

    // Process individual event pages if needed
    if (events.length > 0) {
      const eventDetailsPromises = events.map(async (event) => {
        if (event.eventUrl && event.eventUrl !== ROM_URL) {
          try {
            const detailResponse = await axios.get(event.eventUrl);
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);

            // Try to get more detailed information
            const detailedDesc = detail$('.description, .content, .event-description, .details, [class*="description"], .body').text().trim();
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

            // Try to get price information
            const detailedPriceText = detail$('.prices, .price-range, [class*="price"], .tickets, .admission').text().trim();
            if (detailedPriceText && (!event.priceText || detailedPriceText.length > event.priceText.length)) {
              event.priceText = detailedPriceText;
            }

          } catch (detailError) {
            console.error(`❌ Error fetching details for event: ${event.title}`, detailError);
          }
        }
        return event;
      };

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

        // Create formatted event
        const formattedEvent = {
          id: eventId,
          title: `Toronto - ${event.title}`,
          description: event.description,
          categories: extractCategories(event.title, event.description),
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: ROM_VENUE,
          imageUrl: event.imageUrl,
          officialWebsite: event.eventUrl || ROM_URL,
          price: event.priceText ? extractPrice(event.priceText) : 'Museum admission rates apply. See website for details',
          location: 'Toronto, Ontario',
          sourceURL: ROM_URL,
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
        };

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
      console.warn('⚠️ Warning: No events found on Royal Ontario Museum website. No events were added.');
    } else if (addedEvents === 0) {
      console.warn('⚠️ Warning: Events were found but none were added (possibly all duplicates).');
    } else {
      console.log(`📊 Successfully added ${addedEvents} new Royal Ontario Museum events`);
    }

  } catch (error) {
    console.error('❌ Error scraping Royal Ontario Museum events:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }

  return addedEvents;
}

// Run the scraper
scrapeROMEvents()
  .then(addedEvents => {
    console.log(`✅ Royal Ontario Museum scraper completed. Added ${addedEvents} new events.`);
  }
  .catch(error => {
    console.error('❌ Error running Royal Ontario Museum scraper:', error);
    process.exit(1);
  };


// Async function export added by targeted fixer
module.exports = scrapeROMEvents;