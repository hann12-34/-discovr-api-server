const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

// Safe URL helper to prevent undefined errors
const safeUrl = (url, baseUrl, fallback = null) => {
  if (!url) return fallback;
  if (typeof url === 'string' && url.startsWith('http')) return url;
  if (typeof url === 'string') return `${baseUrl}${url}`;
  return fallback;
};

// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};


const BASE_URL = 'https://masseyhall.mhrth.com';

const getMasseyHallVenue = (city) => ({
  name: 'Massey Hall',
  address: '178 Victoria St, Toronto, ON M5B 1T7',
  city: 'Toronto',
  state: 'ON',
  zip: 'M5B 1T7',
  latitude: 43.6554,
  longitude: -79.3792
});

async function scrapeMasseyHallEvents(city) {
  // 🚨 CRITICAL: City validation per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
  const EXPECTED_CITY = 'Toronto';
  if (city !== EXPECTED_CITY) {
    throw new Error(`City mismatch! Expected '${EXPECTED_CITY}', got '${city}'`);
  }

  const mongoURI = process.env.MONGODB_URI;
  const client = new MongoClient(mongoURI);

  try {
    await client.connect();
    const eventsCollection = client.db('discovr').collection('events');
    console.log('🚀 Scraping Massey Hall events...');

    const { data } = await axios.get(`${BASE_URL}/events/`);
    const $ = cheerio.load(data);
    const events = [];
    const venue = getMasseyHallVenue(city);

    $('.event-item, .concert-item, .show-item').each((i, el) => {
      const title = $(el).find('h3, h2, .event-title, .title').text().trim();
      const eventUrl = $(el).find('a').attr('href');
      const imageUrl = $(el).find('img').attr('src');
      const dateText = $(el).find('.date, .event-date, .dates').text().trim();

      if (title && eventUrl) {
        const urlsToTry = [
          `${BASE_URL}/whats-on/`,
          `${BASE_URL}/events/`,
          `${BASE_URL}/calendar/`,
          `${BASE_URL}/shows/`,
          `${BASE_URL}/`
        ];
        events.push({
          title,
          eventUrl: safeUrl(eventUrl, BASE_URL, eventUrl),
          imageUrl: safeUrl(imageUrl, BASE_URL, null),
          dateText
        });
      }
    });

    let addedEvents = 0;
    for (const event of events) {
      try {
        let startDate, endDate;
        if (event.dateText) {
          const parsedDates = parseDateText(event.dateText);
          startDate = parsedDates.startDate;
          endDate = parsedDates.endDate;
        }

        const formattedEvent = {
          id: generateEventId(event.title, venue.name, startDate),
          title: event.title,
          url: event.eventUrl,
          sourceUrl: event.eventUrl,
          description: '',
          startDate: startDate || new Date(),
          endDate: endDate || startDate || new Date(),
          venue: venue,
          price: 'Varies',
          categories: extractCategories('Music, Concert, Performance'),
          source: 'Massey Hall-' + this.cityConfig.city,
          city: 'Toronto',
          featured: false,
          tags: ['music', 'concert', 'performance', 'historic venue'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const existingEvent = await eventsCollection.findOne({ id: formattedEvent.id });
        
        if (!existingEvent) {
          await eventsCollection.insertOne(formattedEvent);
          addedEvents++;
          console.log(`✅ Added event: ${formattedEvent.title}`);
        } else {
          console.log(`⏭️ Skipped duplicate event: ${formattedEvent.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing event "${event.title}":`, error);
      }
    }

    console.log(`✅ Successfully added ${addedEvents} new Massey Hall events`);
    return events;
  } catch (error) {
    console.error('Error scraping Massey Hall events:', error);
    return [];
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Clean production export
module.exports = { scrapeEvents: scrapeMasseyHallEvents  };
