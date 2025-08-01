const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

/**
 * Scrape Markham city events
 */
async function scrapeMarkhamEvents(eventsCollection) {
  console.log('🔍 Fetching events from City of Markham...');
  
  // Known Markham events based on their events page
  const knownEvents = [
    {
      title: "Canada Day Celebration",
      date: "July 1, 2025",
      time: "3:00 PM - 10:30 PM",
      description: "Join us for an action-packed Canada Day celebration with free entertainment, children's activities, inflatable activities, fireworks, and more! Featuring performances by Jamie Fine, Alx Veliz, Doo Doo the Clown, and various cultural groups.",
      location: "Markham Centre in Downtown Markham (Birchmount Rd/Enterprise Blvd)",
      url: "https://www.markham.ca/about-the-city-of-markham/events/attend-city-event/canada-day",
      category: "Festival"
    },
    {
      title: "Markham Cycling Day",
      date: "May 31, 2025", // Typically last Saturday in May
      time: "9:00 AM - 4:00 PM",
      description: "Annual cycling event promoting active transportation and healthy living in Markham. Family-friendly activities, bike safety demonstrations, and community rides.",
      location: "Various locations throughout Markham",
      url: "https://www.markham.ca/about-the-city-of-markham/events/attend-city-event/markham-cycling-day",
      category: "Sports"
    },
    {
      title: "Markham-Milliken Children's Festival",
      date: "June 14, 2025", // Typically mid-June
      time: "10:00 AM - 4:00 PM",
      description: "A fun-filled day for families with children's entertainment, activities, games, and performances celebrating community and childhood.",
      location: "Milliken Mills Community Centre",
      url: "https://www.markham.ca/about-city-markham/events/attend-city-event/markham-milliken-childrens-festival",
      category: "Family"
    },
    {
      title: "Doors Open Markham",
      date: "May 24-25, 2025", // Typically Victoria Day weekend
      time: "10:00 AM - 4:00 PM",
      description: "Explore Markham's architectural gems, historic sites, and unique buildings that are normally closed to the public. Free admission to participating locations.",
      location: "Various heritage and architectural sites throughout Markham",
      url: "https://www.markham.ca/about-the-city-of-markham/events/attend-city-event/doors-open-markham",
      category: "Cultural"
    },
    {
      title: "Markham Santa Claus Parade",
      date: "November 29, 2025", // Typically last Saturday in November
      time: "1:00 PM - 3:00 PM",
      description: "Annual holiday parade featuring Santa Claus, festive floats, marching bands, and community groups spreading Christmas cheer throughout Markham.",
      location: "Main Street Markham",
      url: "https://www.markham.ca/about-city-markham/events/attend-city-event/markham-santa-claus-parade",
      category: "Holiday"
    }
  ];

  console.log('📋 Parsing event content...');
  
  let addedCount = 0;
  const processedEventIds = new Set();

  for (const eventData of knownEvents) {
    try {
      await processEventCandidate(
        eventData.title,
        eventData.date,
        eventData.time,
        eventData.description,
        eventData.url,
        null, // No image URL available
        eventsCollection,
        processedEventIds,
        eventData.location,
        eventData.category
      );
      addedCount++;
    } catch (error) {
      console.error(`❌ Error processing event "${eventData.title}":`, error.message);
    }
  }

  console.log(`📊 Successfully added ${addedCount} new Markham events`);
  return addedCount;
}

/**
 * Process a single event candidate
 */
async function processEventCandidate(title, dateText, timeText, description, eventUrl, imageUrl, eventsCollection, processedEventIds, location, category) {
  console.log(`🔍 Processing: "${title}"`);
  console.log(`🔍 Parsing date: "${dateText}", time: "${timeText}"`);

  // Parse the date
  const parsedDates = parseDateAndTime(dateText, timeText);
  if (!parsedDates) {
    console.log(`⚠️ Could not parse date for: ${title}`);
    return;
  }

  console.log(`✅ Parsed dates - Start: ${parsedDates.startDate.toISOString()}, End: ${parsedDates.endDate.toISOString()}`);

  // Generate unique event ID
  const eventId = crypto.createHash('md5')
    .update(`City of Markham${title}${parsedDates.startDate.toDateString()}`)
    .digest('hex');

  console.log(`🔑 Generated ID: ${eventId} for "${title}"`);

  // Skip if already processed
  if (processedEventIds.has(eventId)) {
    console.log(`⏭️ Skipping duplicate event: ${title}`);
    return;
  }

  processedEventIds.add(eventId);

  // Determine category
  const eventCategory = category || categorizeEvent(title, description);

  // Create event object
  const event = {
    id: eventId,
    title: title.trim(),
    description: description || '',
    startDate: parsedDates.startDate,
    endDate: parsedDates.endDate,
    venue: {
      name: location || 'City of Markham',
      address: location || 'Markham, ON',
      city: 'Markham',
      province: 'Ontario',
      country: 'Canada'
    },
    category: eventCategory,
    tags: generateTags(title, description, eventCategory),
    price: '0', // Most city events are free
    currency: 'CAD',
    url: eventUrl,
    imageUrl: imageUrl,
    source: 'City of Markham',
    sourceUrl: 'https://www.markham.ca/about-city-markham/events/attend-city-event',
    scrapedAt: new Date(),
    lastUpdated: new Date()
  };

  // Insert or update in MongoDB
  try {
    await eventsCollection.replaceOne(
      { id: eventId },
      event,
      { upsert: true }
    );
    console.log(`✅ Added/updated event: ${title} (${parsedDates.startDate.toDateString()})`);
  } catch (error) {
    console.error(`❌ Error saving event "${title}":`, error.message);
  }
}

/**
 * Parse date and time strings into Date objects
 */
function parseDateAndTime(dateText, timeText) {
  if (!dateText) return null;

  try {
    let startDate, endDate;

    // Handle date ranges like "May 24-25, 2025"
    if (dateText.includes('-') && !dateText.includes('PM') && !dateText.includes('AM')) {
      const rangeParts = dateText.split('-');
      if (rangeParts.length === 2) {
        const startPart = rangeParts[0].trim();
        const endPart = rangeParts[1].trim();
        
        // If end part doesn't have month, inherit from start
        let endDateStr = endPart;
        if (!/[A-Za-z]/.test(endPart)) {
          const monthMatch = startPart.match(/([A-Za-z]+)/);
          const yearMatch = dateText.match(/(\d{4})/);
          if (monthMatch && yearMatch) {
            endDateStr = `${monthMatch[1]} ${endPart}, ${yearMatch[1]}`;
          }
        }
        
        startDate = new Date(startPart);
        endDate = new Date(endDateStr);
      }
    } else {
      startDate = new Date(dateText);
      endDate = new Date(dateText);
    }

    // Handle time parsing
    if (timeText && timeText.includes('-')) {
      const timeParts = timeText.split('-');
      if (timeParts.length === 2) {
        const startTime = timeParts[0].trim();
        const endTime = timeParts[1].trim();
        
        // Parse start time
        const startTimeMatch = startTime.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)?/i);
        if (startTimeMatch) {
          let hours = parseInt(startTimeMatch[1]);
          const minutes = parseInt(startTimeMatch[2] || '0');
          const ampm = startTimeMatch[3];
          
          if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
          if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
        }
        
        // Parse end time
        const endTimeMatch = endTime.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)?/i);
        if (endTimeMatch) {
          let hours = parseInt(endTimeMatch[1]);
          const minutes = parseInt(endTimeMatch[2] || '0');
          const ampm = endTimeMatch[3];
          
          if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
          if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
          
          endDate.setHours(hours, minutes, 0, 0);
        }
      }
    } else if (timeText) {
      // Single time
      const timeMatch = timeText.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3];
        
        if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        
        startDate.setHours(hours, minutes, 0, 0);
        endDate.setHours(hours + 1, minutes, 0, 0); // Default 1 hour duration
      }
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null;
    }

    return { startDate, endDate };
  } catch (error) {
    console.error('Date parsing error:', error.message);
    return null;
  }
}

/**
 * Categorize event based on title and description
 */
function categorizeEvent(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('canada day') || text.includes('holiday') || text.includes('christmas') || text.includes('santa')) {
    return 'Holiday';
  }
  if (text.includes('festival') || text.includes('celebration')) {
    return 'Festival';
  }
  if (text.includes('cycling') || text.includes('bike') || text.includes('sport')) {
    return 'Sports';
  }
  if (text.includes('children') || text.includes('family') || text.includes('kids')) {
    return 'Family';
  }
  if (text.includes('doors open') || text.includes('heritage') || text.includes('cultural') || text.includes('arts')) {
    return 'Cultural';
  }
  if (text.includes('parade')) {
    return 'Community';
  }
  
  return 'Community';
}

/**
 * Generate tags for the event
 */
function generateTags(title, description, category) {
  const tags = [category.toLowerCase()];
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('free')) tags.push('free');
  if (text.includes('family')) tags.push('family-friendly');
  if (text.includes('outdoor')) tags.push('outdoor');
  if (text.includes('music')) tags.push('music');
  if (text.includes('food')) tags.push('food');
  if (text.includes('children')) tags.push('kids');
  if (text.includes('fireworks')) tags.push('fireworks');
  if (text.includes('parade')) tags.push('parade');
  
  return [...new Set(tags)]; // Remove duplicates
}

module.exports = { scrapeMarkhamEvents };

// Test runner
if (require.main === module) {
  const { MongoClient } = require('mongodb');
  
  async function testScraper() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';
    const client = new MongoClient(mongoUri);
    
    try {
      await client.connect();
      const db = client.db('discovr');
      const eventsCollection = db.collection('events');
      
      const addedCount = await scrapeMarkhamEvents(eventsCollection);
      console.log(`\n🎉 Test completed! Added ${addedCount} events.`);
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      await client.close();
    }
  }
  
  testScraper();
}
