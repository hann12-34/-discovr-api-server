const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Constants
const RIPLEYS_EVENTS_URLS = [
  'https://www.ripleyaquariums.com/canada/experiences/', // Experiences page has most event listings
  'https://www.ripleyaquariums.com/canada/daily-programs/', // Daily programs page has regular events
  'https://www.ripleyaquariums.com/canada/buy-tickets/', // Ticket page often contains events
  'https://www.ripleyaquariums.com/canada/events/',
  'https://www.ripleyaquariums.com/canada/special-events/' // Try special events page
];
const RIPLEYS_BASE_URL = 'https://www.ripleyaquariums.com/canada';
const RIPLEYS_VENUE = {
  name: "Ripley's Aquarium of Canada",
  address: "288 Bremner Boulevard, Toronto, ON M5V 3L9",
  city: city,
  province: "Ontario",
  postalCode: "M5V 3L9"
};

// Check for MongoDB URI in environment variables
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ Error: MONGODB_URI environment variable not set');
  process.exit(1);
}

/**
 * Generate a unique ID for the event based on venue, title and date
 * @param {string} title - Event title
 * @param {Date} date - Event date
 * @returns {string} MD5 hash of venue name, title and date
 */
function generateEventId(title, date) {
  const data = `${RIPLEYS_VENUE.name}-${title}-${date.toISOString().split('T')[0]}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Extract categories from event title and description
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {Array} Array of event categories
 */
function extractCategories(title, description) {
  const categories = [];
  const combined = `${title} ${description}`.toLowerCase();

  // Define keyword to category mapping
  const categoryMapping = {
    aquarium: 'Aquatic',
    marine: 'Aquatic',
    fish: 'Aquatic',
    ocean: 'Aquatic',
    sea: 'Aquatic',
    underwater: 'Aquatic',
    shark: 'Aquatic',
    family: 'Family',
    kids: 'Family',
    children: 'Family',
    education: 'Education',
    learn: 'Education',
    workshop: 'Workshop',
    interactive: 'Interactive',
    exhibit: 'Exhibition',
    exhibition: 'Exhibition',
    holiday: 'Holiday',
    special: 'Special Event',
    jazz: 'Music',
    music: 'Music',
    night: 'After Hours',
    adult: 'Adult',
    tour: 'Tour'
  };

  // Check for keywords
  Object.entries(categoryMapping).forEach(([keyword, category]) => {
    if (combined.includes(keyword) && !categories.includes(category)) {
      categories.push(category);
    }
  };

  // Add default category if none found
  if (categories.length === 0) {
    categories.push('Aquatic');
  }

  return categories;
}

/**
 * Extract price information from text
 * @param {string} text - Text containing price information
 * @returns {string} Formatted price string
 */
function extractPrice(text) {
  if (!text) return 'See website for details';

  const priceText = text.toLowerCase();

  // Check for free events
  if (priceText.includes('free')) {
    return 'Free';
  }

  // Look for price patterns
  const priceMatch = priceText.match(/\$\s*(\d+(?:\.\d{1,2}?)/);
  if (priceMatch) {
    return `$${priceMatch[1]}+`;
  }

  // Look for price ranges
  const priceRangeMatch = priceText.match(/\$\s*(\d+(?:\.\d{1,2}?)(?:\s*-\s*|\s*to\s*)\$?\s*(\d+(?:\.\d{1,2}?)/);
  if (priceRangeMatch) {
    return `$${priceRangeMatch[1]} - $${priceRangeMatch[2]}`;
  }

  return 'See website for details';
}

/**
 * Normalize relative URLs to absolute URLs
 * @param {string} url - URL to normalize
 * @returns {string} Normalized absolute URL
 */
function normalizeUrl(url) {
  if (!url) return '';

  // Already absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Handle URLs that start with //
  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  // Handle relative URLs
  if (url.startsWith('/')) {
    return `${RIPLEYS_BASE_URL}${url}`;
  }

  // Handle relative URLs without leading slash
  return `${RIPLEYS_BASE_URL}/${url}`;
}

/**
 * Parse event dates from text
 * @param {string} dateText - Date text from event
 * @param {string} timeText - Time text from event
 * @returns {Object} Object containing startDate and endDate
 */
function parseEventDates(dateText, timeText) {
  if (!dateText) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Handle date ranges like "January 15 - February 28, 2023"
  const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2}(?:st|nd|rd|th)?\s*(?:-|–|to)\s*([A-Za-z]+)?\s*(\d{1,2}(?:st|nd|rd|th)?,?\s*(\d{4}?/i;
  const dateRangeMatch = dateText.match(dateRangePattern);

  if (dateRangeMatch) {
    const startMonth = getMonthIndex(dateRangeMatch[1]);
    const startDay = parseInt(dateRangeMatch[2], 10);
    // If end month is specified, use it, otherwise use start month
    const endMonth = dateRangeMatch[3]
      ? getMonthIndex(dateRangeMatch[3])
      : startMonth;
    const endDay = parseInt(dateRangeMatch[4], 10);
    // If year is specified, use it, otherwise use current year
    const year = dateRangeMatch[5]
      ? parseInt(dateRangeMatch[5], 10)
      : currentYear;

    // Create start and end dates
    const startDate = new Date(year, startMonth, startDay);
    const endDate = new Date(year, endMonth, endDay);

    // Handle year rollover (e.g., "December 15 - January 15")
    if (endMonth < startMonth) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Apply times if available
    applyTimeToDate(startDate, timeText, 'start');
    applyTimeToDate(endDate, timeText, 'end');

    return { startDate, endDate };
  }

  // Handle single dates like "January 15, 2023"
  const singleDatePattern = /([A-Za-z]+)\s+(\d{1,2}(?:st|nd|rd|th)?,?\s*(\d{4}?/i;
  const singleDateMatch = dateText.match(singleDatePattern);

  if (singleDateMatch) {
    const month = getMonthIndex(singleDateMatch[1]);
    const day = parseInt(singleDateMatch[2], 10);
    // If year is specified, use it, otherwise use current year
    const year = singleDateMatch[3]
      ? parseInt(singleDateMatch[3], 10)
      : currentYear;

    // Create start date
    const startDate = new Date(year, month, day);

    // For end date, default to same day if no time specified
    // or end of day if time is specified
    const endDate = new Date(startDate);

    // Apply times if available
    applyTimeToDate(startDate, timeText, 'start');
    applyTimeToDate(endDate, timeText, 'end');

    // If no specific end time, set end time to be 2 hours after start
    if (!timeText || !timeText.includes('-')) {
      endDate.setHours(endDate.getHours() + 2);
    }

    return { startDate, endDate };
  }

  // Handle recurring events like "daily" or days of week
  const recurringMatch = dateText.match(/\b(daily|every\s*day|weekdays|weekends)\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);

  if (recurringMatch) {
    const now = new Date();
    const startDate = new Date();
    startDate.setHours(9, 0, 0, 0); // Start time for daily programs

    // Apply any specific time if available
    if (timeText) {
      applyTimeToDate(startDate, timeText, 'start');
    }

    const endDate = new Date(startDate);

    // If we have explicit end time, use it, otherwise add duration
    if (timeText && timeText.includes('-')) {
      applyTimeToDate(endDate, timeText, 'end');
    } else {
      // Default duration of 1 hour for programs
      endDate.setHours(endDate.getHours() + 1);
    }

    // For recurring events, make sure they're in the future
    // If today's event has already passed, move to next occurrence
    if (startDate < now) {
      const dayType = recurringMatch[0].toLowerCase();

      if (dayType.match(/daily|every\s*day/i)) {
        // For daily events, move to tomorrow
        startDate.setDate(startDate.getDate() + 1);
        endDate.setDate(endDate.getDate() + 1);
      } else if (dayType.match(/weekdays/i)) {
        // For weekday events, move to next weekday
        do {
          startDate.setDate(startDate.getDate() + 1);
          endDate.setDate(endDate.getDate() + 1);
        } while (startDate.getDay() === 0 || startDate.getDay() === 6); // 0 is Sunday, 6 is Saturday
      } else if (dayType.match(/weekends/i)) {
        // For weekend events, move to next weekend day
        do {
          startDate.setDate(startDate.getDate() + 1);
          endDate.setDate(endDate.getDate() + 1);
        } while (startDate.getDay() !== 0 && startDate.getDay() !== 6); // 0 is Sunday, 6 is Saturday
      } else {
        // For specific day of week events, move to next occurrence
        const dayMap = {
          monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0
        };
        const targetDay = dayMap[dayType];

        if (targetDay !== undefined) {
          const daysUntilNext = (targetDay + 7 - startDate.getDay()) % 7;
          const daysToAdd = daysUntilNext === 0 ? 7 : daysUntilNext; // If today is the day, go to next week

          startDate.setDate(startDate.getDate() + daysToAdd);
          endDate.setDate(endDate.getDate() + daysToAdd);
        }
      }
    }

    return { startDate, endDate };
  }

  return null;
}

/**
 * Apply time to date object
 * @param {Date} date - Date object to modify
 * @param {string} timeText - Time text from event
 * @param {string} type - Either 'start' or 'end'
 */
function applyTimeToDate(date, timeText, type) {
  if (!timeText) return;

  // Handle time ranges like "7:00 PM - 9:00 PM" or "7PM-9PM"
  const timeRangePattern = /(\d{1,2}(?::(\d{2}?\s*([ap]\.?m\.?|[AP]\.?M\.?)?(?:\s*-\s*|\s*to\s*)(\d{1,2}(?::(\d{2}?\s*([ap]\.?m\.?|[AP]\.?M\.?)?/i;
  const timeRangeMatch = timeText.match(timeRangePattern);

  if (timeRangeMatch) {
    const startHour = parseInt(timeRangeMatch[1], 10);
    const startMinute = timeRangeMatch[2] ? parseInt(timeRangeMatch[2], 10) : 0;
    const startPeriod = timeRangeMatch[3] || '';

    const endHour = parseInt(timeRangeMatch[4], 10);
    const endMinute = timeRangeMatch[5] ? parseInt(timeRangeMatch[5], 10) : 0;
    const endPeriod = timeRangeMatch[6] || '';

    if (type === 'start') {
      let hour = startHour;
      // Convert to 24-hour format if PM
      if (startPeriod.toLowerCase().includes('p') && hour < 12) {
        hour += 12;
      }
      // Special case for 12 AM
      if (startPeriod.toLowerCase().includes('a') && hour === 12) {
        hour = 0;
      }
      date.setHours(hour, startMinute, 0, 0);
    } else if (type === 'end') {
      let hour = endHour;
      // Convert to 24-hour format if PM
      if (endPeriod.toLowerCase().includes('p') && hour < 12) {
        hour += 12;
      }
      // Special case for 12 AM
      if (endPeriod.toLowerCase().includes('a') && hour === 12) {
        hour = 0;
      }
      date.setHours(hour, endMinute, 0, 0);
    }

    return;
  }

  // Handle single time like "7:00 PM" or "7PM"
  const singleTimePattern = /(\d{1,2}(?::(\d{2}?\s*([ap]\.?m\.?|[AP]\.?M\.?)?/i;
  const singleTimeMatch = timeText.match(singleTimePattern);

  if (singleTimeMatch) {
    const hour = parseInt(singleTimeMatch[1], 10);
    const minute = singleTimeMatch[2] ? parseInt(singleTimeMatch[2], 10) : 0;
    const period = singleTimeMatch[3] || '';

    let adjustedHour = hour;
    // Convert to 24-hour format if PM
    if (period.toLowerCase().includes('p') && adjustedHour < 12) {
      adjustedHour += 12;
    }
    // Special case for 12 AM
    if (period.toLowerCase().includes('a') && adjustedHour === 12) {
      adjustedHour = 0;
    }

    if (type === 'start') {
      date.setHours(adjustedHour, minute, 0, 0);
    } else if (type === 'end') {
      // If it's an end time but only one time is specified,
      // set end time to 2 hours after specified time
      date.setHours(adjustedHour + 2, minute, 0, 0);
    }
  }
}

/**
 * Get month index from month name
 * @param {string} month - Month name
 * @returns {number} Zero-based month index (0-11)
 */
function getMonthIndex(month) {
  const months = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    sept: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11
  };

  return months[month.toLowerCase()] || 0;
}

/**
 * Main function to scrape Ripley's Aquarium events
 * @param {Object} eventsCollection - MongoDB collection for events
 * @returns {number} Number of events added
 */
async function scrapeRipleysEvents(eventsCollection) {
  const city = city;
  if (!city) {
    console.error('❌ City argument is required. e.g. node scrape-ripleysaquarium-events.js Toronto');
    process.exit(1);
  }
  let addedEvents = 0;

  try {
    console.log('🔍 Fetching events from Ripley\'s Aquarium...');

    // Array to store all events
    const events = [];

    // Try each URL in our list
    for (const currentUrl of RIPLEYS_EVENTS_URLS) {
      try {
        console.log(`🔍 Fetching events from ${currentUrl}...`);

        // Fetch the events page
        const response = await axios.get(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          maxRedirects: 5,
          timeout: 10000
        };

        const html = response.data;
        const $ = cheerio.load(html);

        // Debug: Output what elements we found
        console.log(`Found ${$('.experience-card, .program-item, .event-card, .card, .experience-item, article, .event, .daily-program, .program, .program-card, .featured-item').length} potential event elements`);

        // Debug: List all classes on the page for analysis
        const allClasses = new Set();
        $('[class]').each((i, el) => {
          const classes = $(el).attr('class').split(/\s+/);
          classes.forEach(className => {
            if (className.includes('event') || className.includes('program') || className.includes('experience') || className.includes('card')) {
              allClasses.add(className);
            }
          };
        };
        console.log('Found classes that might contain events:', Array.from(allClasses).join(', '));

        // Look for event listings - adapted selectors for Ripley's website structure
        $('.experience-card, .program-item, .event-card, .card, .experience-item, article, .event, .daily-program, .program, .program-card, .featured-item').each((i, element) => {
          try {
            const eventElement = $(element);

            // Extract title
            const titleElement = eventElement.find('h2, h3, h4, h5, .experience-title, .event-title, .program-title, .title, .heading, .card-title');
            const title = titleElement.text().trim() || eventElement.attr('aria-label') || '';

            // Extract date
            const dateElement = eventElement.find('.date, time, .event-date, .program-date, .experience-date, [class*="date"], .calendar-date, .schedule');
            let dateText = dateElement.text().trim();

            // If no date found, look for text containing days of the week or 'daily'
            if (!dateText) {
              const allText = eventElement.text();
              const dayPattern = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|daily|every day|weekdays|weekends)\b/i;
              const dayMatch = allText.match(dayPattern);
              if (dayMatch) {
                dateText = dayMatch[0];
              }
            }

            // Extract time
            const timeElement = eventElement.find('.time, .event-time, [class*="time"]');
            const timeText = timeElement.text().trim();

            // Extract description
            const descriptionElement = eventElement.find('p, .description, .event-description, [class*="description"], .summary');
            let description = descriptionElement.text().trim();
            if (!description || description.length < 20) {
              description = `Event at Ripley's Aquarium of Canada. See website for more details.`;
            }

            // Extract image URL
            const imageElement = eventElement.find('img');
            let imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
            imageUrl = normalizeUrl(imageUrl);

            // Extract event URL
            const linkElement = eventElement.find('a');
            let eventUrl = linkElement.attr('href') || currentUrl;
            eventUrl = normalizeUrl(eventUrl);

            // Extract price information
            const priceElement = eventElement.find('.price, [class*="price"], .cost, [class*="admission"]');
            const priceText = priceElement.text().trim();
            const price = extractPrice(priceText);

            // Only add events with title and date
            if (title && dateText) {
              // Check if we already have this event (avoid duplicates across multiple URLs)
              const isDuplicate = events.some(existingEvent =>
                existingEvent.title === title &&
                existingEvent.dateText === dateText
              );

              if (!isDuplicate) {
                events.push({
                  title,
                  dateText,
                  timeText,
                  description,
                  imageUrl,
                  eventUrl,
                  price
                };

                console.log(`🔍 Found event: ${title}`);
              }
            }
          } catch (eventError) {
            console.error(`❌ Error extracting event details:`, eventError.message);
          }
        };

        // If we don't find many events with the primary selectors, try alternative approaches
        if (events.length < 3) {
          console.log('🔍 Looking for additional events using alternative selectors...');

          // Try more generic selectors
          $('.post, .entry, .item, .col, .grid-item').each((i, element) => {
            try {
              const eventElement = $(element);

              // Skip if we've already processed this element
              if (eventElement.hasClass('processed')) return;
              eventElement.addClass('processed');

              const title = eventElement.find('h2, h3, h4, h5, .title, strong').first().text().trim();
              if (!title) return;

              // Look for date patterns in the text content
              const allText = eventElement.text();

              // Check for date patterns
              const datePatterns = [
                /([A-Za-z]+)\s+(\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4}?(?:\s*[-–]\s*(?:[A-Za-z]+)?\s*\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4}?)?/i, // April 15 - April 20, 2025
                /\d{1,2}(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s*[-–]\s*\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+)?(?:,\s*\d{4}?/i, // 15th April, 2025
              ];

              let dateText = '';
              for (const pattern of datePatterns) {
                const match = allText.match(pattern);
                if (match) {
                  dateText = match[0];
                  break;
                }
              }

              if (!dateText) return; // Skip if no date found

              // Extract description (use first paragraph or basic description)
              let description = eventElement.find('p').first().text().trim();
              if (!description || description.length < 20) {
                description = `Event at Ripley's Aquarium of Canada. See website for details.`;
              }

              // Extract image
              let imageUrl = eventElement.find('img').first().attr('src') || '';
              imageUrl = normalizeUrl(imageUrl);

              // Extract link
              let eventUrl = eventElement.find('a').first().attr('href') || currentUrl;
              eventUrl = normalizeUrl(eventUrl);

              // Check for duplicates before adding
              const isDuplicate = events.some(existingEvent =>
                existingEvent.title === title &&
                existingEvent.dateText === dateText
              );

              if (!isDuplicate) {
                events.push({
                  title,
                  dateText,
                  timeText: '',
                  description,
                  imageUrl,
                  eventUrl,
                  price: 'See website for details'
                };

                console.log(`🔍 Found additional event: ${title}`);
              }
            } catch (eventError) {
              console.error(`❌ Error extracting event with alternative selectors:`, eventError.message);
            }
          };
        }
      } catch (urlError) {
        console.error(`❌ Error fetching from ${currentUrl}:`, urlError.message);
      }
    }

    // Fetch additional details from individual event pages
    if (events.length > 0) {
      console.log(`🔍 Fetching additional details from ${events.length} event pages...`);

      for (const event of events) {
        try {
          if (event.eventUrl && !RIPLEYS_EVENTS_URLS.includes(event.eventUrl)) {
            const detailResponse = await axios.get(event.eventUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            };
            const detailHtml = detailResponse.data;
            const detail$ = cheerio.load(detailHtml);

            // Try to get a better description
            const detailDescription = detail$('.description, [class*="description"], .content p, main p').slice(0, 3).text().trim();
            if (detailDescription && detailDescription.length > event.description.length) {
              event.description = detailDescription;
            }

            // Try to get a better image
            if (!event.imageUrl) {
              const detailImage = detail$('img').first();
              const imgSrc = detailImage.attr('src') || detailImage.attr('data-src');
              if (imgSrc) {
                event.imageUrl = normalizeUrl(imgSrc);
              }
            }

            // Try to get better date/time info
            if (!event.dateText) {
              const detailDate = detail$('.date, time, [class*="date"], .calendar-date').first().text().trim();
              if (detailDate) {
                event.dateText = detailDate;
              }
            }

            console.log(`🔍 Enhanced details for: ${event.title}`);
          }
        } catch (detailError) {
          console.error(`❌ Error fetching details for event: ${event.title}`, detailError.message);
        }
      }
    }

    // Process each event and insert into MongoDB
    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}, Date: ${event.dateText || 'Unknown'}`);

        if (!event.dateText) {
          console.log(`⏭️ Skipping event with missing date: ${event.title}`);
          continue;
        }

        // Parse date information
        const dateInfo = parseEventDates(event.dateText, event.timeText);

        // Skip events with invalid dates
        if (!dateInfo || isNaN(dateInfo.startDate.getTime()) || isNaN(dateInfo.endDate.getTime())) {
          console.log(`⏭️ Skipping event with invalid date: ${event.title}`);
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
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate,
          venue: RIPLEYS_VENUE,
          imageUrl: event.imageUrl,
          url: event.eventUrl,
          price: event.price || 'See website for details',
          source: "Ripley's Aquarium",
          lastUpdated: new Date()
        };

        // Insert event into MongoDB
        await eventsCollection.updateOne({ id: eventId }, { $set: formattedEvent }, { upsert: true };
        console.log(`✅ Added/updated event: ${event.title}`);
        addedEvents++;
      } catch (error) {
        console.error(`❌ Error processing regular event ${event.title}: ${error.message}`);
      }
    }

    // Note: Additional event fetching logic removed due to undefined functions
    console.log('🔍 Completed processing Ripley\'s Aquarium events...');

    console.log(`📊 Successfully added ${addedEvents} new Ripley's Aquarium events`);
    return addedEvents;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return 0;
  }
}

// Run the scraper
scrapeRipleysEvents()
  .then(addedEvents => {
    console.log(`✅ Ripley's Aquarium scraper completed. Added ${addedEvents} new events.`);
  }
  .catch(error => {
    console.error('❌ Error running Ripley\'s Aquarium scraper:', error);
    process.exit(1);
  };


// Async function export added by targeted fixer
module.exports = scrapeRipleysEvents;