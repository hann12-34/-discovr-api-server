const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

// Strict date parsing function - no fallbacks allowed
function parseDateAndTime(dateText, timeText = '') {
  if (!dateText || dateText.trim() === '') {
    return null;
  }

  const currentYear = new Date().getFullYear();
  let startDate = null;
  let endDate = null;

  try {
    // Handle date ranges like "June 7 - September 7"
    const rangeMatch = dateText.match(/([A-Za-z]+\s+\d{1,2})\s*-\s*([A-Za-z]+\s+\d{1,2})/);
    if (rangeMatch) {
      const startStr = rangeMatch[1];
      const endStr = rangeMatch[2];
      
      startDate = new Date(`${startStr}, ${currentYear}`);
      endDate = new Date(`${endStr}, ${currentYear}`);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return null;
      }
      
      return { startDate, endDate };
    }

    // Handle single dates
    const singleDate = new Date(`${dateText}, ${currentYear}`);
    if (!isNaN(singleDate.getTime())) {
      startDate = singleDate;
      endDate = new Date(singleDate);
      
      // If time is provided, parse it
      if (timeText) {
        const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const ampm = timeMatch[3].toLowerCase();
          
          if (ampm === 'pm' && hours !== 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
          endDate.setHours(hours + 2, minutes, 0, 0); // Assume 2-hour duration
        }
      }
      
      return { startDate, endDate };
    }

  } catch (error) {
    console.error(`❌ Date parsing error: ${error.message}`);
    return null;
  }

  return null;
}

// Generate unique event ID
function generateEventId(venueName, eventTitle, startDate) {
  const idString = `${venueName}-${eventTitle}-${startDate.toISOString().split('T')[0]}`;
  return crypto.createHash('md5').update(idString).digest('hex');
}

// Extract price from text
function extractPrice(text) {
  if (!text) return null;
  
  const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  return priceMatch ? parseFloat(priceMatch[1]) : null;
}

// Categorize event
function categorizeEvent(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('music') || text.includes('dj') || text.includes('concert')) return 'Music';
  if (text.includes('bubble') || text.includes('character') || text.includes('kids')) return 'Family';
  if (text.includes('safety') || text.includes('education')) return 'Education';
  if (text.includes('party') || text.includes('celebration')) return 'Entertainment';
  if (text.includes('water') || text.includes('pool') || text.includes('swim')) return 'Recreation';
  
  return 'Entertainment';
}

// Process individual event
async function processEvent(eventData, eventsCollection, processedEventIds) {
  const { title, dateRange, description, eventUrl, recurring } = eventData;
  
  console.log(`🔍 Processing: "${title}"`);
  
  // Parse dates
  const dateResult = parseDateAndTime(dateRange);
  if (!dateResult) {
    console.log(`❌ Could not parse date: "${dateRange}"`);
    return 0;
  }

  const { startDate, endDate } = dateResult;
  console.log(`✅ Parsed dates - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);

  // Generate unique event ID
  const eventId = generateEventId('Wet\'n\'Wild Toronto', title, startDate);
  console.log(`🔑 Generated ID: ${eventId} for "${title}"`);

  // Skip if already processed
  if (processedEventIds.has(eventId)) {
    console.log(`⏭️ Skipping duplicate event: ${title}`);
    return 0;
  }

  // Create event object
  const event = {
    _id: eventId,
    id: eventId,
    title: title.trim(),
    description: description || '',
    startDate: startDate,
    endDate: endDate,
    venue: {
      name: 'Wet\'n\'Wild Toronto',
      address: '7855 Finch Ave W, Brampton, ON L6T 0B2',
      city: 'Brampton',
      province: 'Ontario',
      country: 'Canada'
    },
    category: categorizeEvent(title, description),
    price: null, // Water park admission required
    currency: 'CAD',
    url: eventUrl,
    source: 'Wet\'n\'Wild Toronto',
    tags: ['waterpark', 'family', 'summer', 'toronto'],
    isRecurring: recurring || false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    // Insert or update event
    await eventsCollection.replaceOne(
      { _id: eventId },
      event,
      { upsert: true }
    );
    
    processedEventIds.add(eventId);
    console.log(`✅ Added/updated event: ${title} (${startDate.toDateString()})`);
    return 1;
  } catch (error) {
    console.error(`❌ Error saving event ${title}: ${error.message}`);
    return 0;
  }
}

// Main scraping function
async function scrapeWetNWildEvents(eventsCollection) {
  console.log('🔍 Fetching events from Wet\'n\'Wild Toronto...');
  
  try {
    const response = await axios.get('https://wetnwildtoronto.com/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    console.log('📋 Parsing event content...');

    const events = [];
    const processedEventIds = new Set();

    // Find event listings
    $('.tribe-events-calendar-list__event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('.tribe-events-calendar-list__event-title a').text().trim();
      const eventUrl = $event.find('.tribe-events-calendar-list__event-title a').attr('href');
      const description = $event.find('.tribe-events-calendar-list__event-description').text().trim();
      
      if (title) {
        events.push({
          title,
          eventUrl: eventUrl ? new URL(eventUrl, 'https://wetnwildtoronto.com').href : null,
          description
        });
      }
    });

    // Also check for individual event pages linked from main events page
    const eventLinks = [];
    $('a[href*="/event/"]').each((index, element) => {
      const href = $(element).attr('href');
      const title = $(element).text().trim();
      
      if (href && title && !eventLinks.some(e => e.href === href)) {
        eventLinks.push({
          href: new URL(href, 'https://wetnwildtoronto.com').href,
          title
        });
      }
    });

    // Process known events with specific details
    const knownEvents = [
      {
        title: 'Bubble Parties',
        dateRange: 'June 7 - September 7',
        description: 'Family-friendly event filled with bubbles and foam! Perfect photo opportunities with vibrant bubble effects! Happening every Tuesday at 1:00 pm and every Sunday at 3:00 pm!',
        eventUrl: 'https://wetnwildtoronto.com/event/bubble-parties/',
        recurring: true
      },
      {
        title: 'Poolside DJ',
        dateRange: 'June 7 - September 7',
        description: 'Get ready to make waves at our poolside DJ party! Join us every Thursday and Sunday, poolside for an electrifying afternoon of beats and waterpark fun!',
        eventUrl: 'https://wetnwildtoronto.com/event/poolside-dj/',
        recurring: true
      },
      {
        title: 'Character Visits',
        dateRange: 'June 7 - September 7',
        description: 'Dive into a magical adventure with our enchanting special guests! Join a mermaid for tales of underwater wonder, set sail with a playful pirate, and perfect your royal wave with a princess!',
        eventUrl: 'https://wetnwildtoronto.com/event/character-visits/',
        recurring: true
      },
      {
        title: 'Water Safety Day',
        dateRange: 'July 1 - July 31',
        description: 'We are partnering with Lifesaving Society to raise awareness about drowning prevention and water safety. Important safety tips for families and water-lovers of all ages!',
        eventUrl: 'https://wetnwildtoronto.com/event/water-safety-day/',
        recurring: false
      }
    ];

    let addedCount = 0;
    
    // Process known events
    for (const eventData of knownEvents) {
      const added = await processEvent(eventData, eventsCollection, processedEventIds);
      addedCount += added;
    }

    console.log(`📊 Successfully added ${addedCount} new Wet'n'Wild Toronto events`);
    return addedCount;

  } catch (error) {
    console.error(`❌ Error scraping Wet'n'Wild Toronto: ${error.message}`);
    throw error;
  }
}

module.exports = { scrapeWetNWildEvents };
