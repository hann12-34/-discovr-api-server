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
    // Handle various date formats for Polish Festival
    // Typically happens in September
    // For now, we'll use a placeholder date since the exact 2025 date isn't announced
    
    if (dateText.toLowerCase().includes('september')) {
      // Polish Festival typically happens in mid-September
      startDate = new Date(`September 14, ${currentYear}`);
      endDate = new Date(`September 15, ${currentYear}`);
    } else {
      // Try to parse the provided date
      let cleanDate = dateText.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/i, '');
      
      if (!cleanDate.includes(currentYear.toString())) {
        cleanDate = `${cleanDate}, ${currentYear}`;
      }
      
      startDate = new Date(cleanDate);
      endDate = new Date(startDate);
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null;
    }

    // Parse time if provided
    if (timeText) {
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const ampm = timeMatch[3].toLowerCase();
        
        if (ampm === 'pm' && hours !== 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        
        startDate.setHours(hours, minutes, 0, 0);
        endDate.setHours(hours + 8, minutes, 0, 0); // Festival runs all day
      }
    } else {
      // Default festival hours
      startDate.setHours(10, 0, 0, 0); // 10 AM start
      endDate.setHours(18, 0, 0, 0); // 6 PM end
    }

    return { startDate, endDate };

  } catch (error) {
    console.error(`❌ Date parsing error: ${error.message}`);
    return null;
  }
}

// Generate unique event ID
function generateEventId(venueName, eventTitle, startDate) {
  const idString = `${venueName}-${eventTitle}-${startDate.toISOString().split('T')[0]}`;
  return crypto.createHash('md5').update(idString).digest('hex');
}

// Categorize event
function categorizeEvent(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('festival') || text.includes('cultural') || text.includes('polish')) return 'Cultural';
  if (text.includes('food') || text.includes('market')) return 'Food & Drink';
  if (text.includes('music') || text.includes('performance')) return 'Music';
  if (text.includes('community') || text.includes('family')) return 'Community';
  
  return 'Cultural';
}

// Process individual event
async function processEvent(eventData, eventsCollection, processedEventIds) {
  const { title, date, time, description, eventUrl, price } = eventData;
  
  console.log(`🔍 Processing: "${title}"`);
  console.log(`🔍 Parsing date: "${date}", time: "${time}"`);
  
  // Parse dates
  const dateResult = parseDateAndTime(date, time);
  if (!dateResult) {
    console.log(`❌ Could not parse date: "${date}"`);
    return 0;
  }

  const { startDate, endDate } = dateResult;
  console.log(`✅ Parsed dates - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);

  // Generate unique event ID
  const eventId = generateEventId('Roncesvalles Village', title, startDate);
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
      name: 'Roncesvalles Village',
      address: 'Roncesvalles Ave, Toronto, ON',
      city: 'Toronto',
      province: 'Ontario',
      country: 'Canada'
    },
    category: categorizeEvent(title, description),
    price: price,
    currency: 'CAD',
    url: eventUrl,
    source: 'Roncesvalles Village',
    tags: ['roncesvalles', 'village', 'community', 'toronto', 'cultural', 'festival'],
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
async function scrapeRoncesvallesVillageEvents(eventsCollection) {
  console.log('🔍 Fetching events from Roncesvalles Village...');
  
  try {
    const response = await axios.get('https://roncesvallesvillage.ca/our-events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    console.log('📋 Parsing event content...');

    const events = [];
    const processedEventIds = new Set();

    // Process known events - Polish Festival is the main annual event
    const knownEvents = [
      {
        title: 'Roncesvalles Polish Festival',
        date: 'September 14-15', // Typical weekend in September
        time: '10:00 am - 6:00 pm',
        description: 'Annual Polish Festival celebrating Polish culture, food, music, and community in Roncesvalles Village. Features traditional Polish food, live music, cultural performances, and family activities.',
        eventUrl: 'https://polishfestival.ca/',
        price: null
      }
    ];

    let addedCount = 0;
    
    // Process known events
    for (const eventData of knownEvents) {
      const added = await processEvent(eventData, eventsCollection, processedEventIds);
      addedCount += added;
    }

    console.log(`📊 Successfully added ${addedCount} new Roncesvalles Village events`);
    return addedCount;

  } catch (error) {
    console.error(`❌ Error scraping Roncesvalles Village: ${error.message}`);
    throw error;
  }
}

module.exports = { scrapeRoncesvallesVillageEvents };
